/**
 * Certificate Service
 * 
 * Handles automatic certificate generation for completed events.
 * Ensures idempotency - prevents duplicate certificate generation.
 */

const path = require('path');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate.model');
const Event = require('../models/Event.model');
const Attendance = require('../models/Attendance.model');
const { generateCertificatePDF } = require('../utils/pdfGenerator');

// Certificate storage directory
const CERTIFICATES_DIR = path.join(__dirname, '../../uploads/certificates');

/**
 * Generate certificates for all attendees of an event
 * Called automatically when event status changes to 'completed'
 * 
 * @param {string} eventId - MongoDB ObjectId of the event
 * @param {string} issuerId - MongoDB ObjectId of the organizer issuing certificates
 * @returns {Promise<Object>} Result with count of certificates generated
 */
const generateCertificatesForEvent = async (eventId, issuerId) => {
  try {
    // Fetch event with validation
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if certificates are enabled for this event
    if (!event.enableCertificates) {
      console.log(`[CertificateService] Certificates not enabled for event: ${event.title}`);
      return {
        success: true,
        message: 'Certificates not enabled for this event',
        generated: 0,
        skipped: 0
      };
    }

    // Check if event is completed
    if (event.status !== Event.EVENT_STATUS.COMPLETED) {
      throw new Error('Certificates can only be generated for completed events');
    }

    // Ensure certificates directory exists
    await ensureCertificatesDirectory();

    // Get all attendees for this event
    const attendees = await Attendance.find({ eventId })
      .populate('userId', 'name email rollNumber department');

    if (attendees.length === 0) {
      console.log(`[CertificateService] No attendees found for event: ${event.title}`);
      return {
        success: true,
        message: 'No attendees found',
        generated: 0,
        skipped: 0
      };
    }

    let generated = 0;
    let skipped = 0;
    const errors = [];

    // Generate certificate for each attendee
    for (const attendance of attendees) {
      try {
        const result = await generateSingleCertificate(
          event,
          attendance.userId,
          issuerId
        );
        
        if (result.created) {
          generated++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[CertificateService] Error generating certificate for user ${attendance.userId._id}:`, err);
        errors.push({
          userId: attendance.userId._id,
          error: err.message
        });
      }
    }

    console.log(`[CertificateService] Event "${event.title}": Generated ${generated}, Skipped ${skipped}`);

    return {
      success: true,
      message: `Certificate generation complete`,
      generated,
      skipped,
      totalAttendees: attendees.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('[CertificateService] Error in generateCertificatesForEvent:', error);
    throw error;
  }
};

/**
 * Generate a single certificate for a user
 * Implements idempotency - skips if certificate already exists
 * 
 * @param {Object} event - Event document
 * @param {Object} user - User document
 * @param {string} issuerId - Issuer's user ID
 * @returns {Promise<Object>} Result with certificate data
 */
const generateSingleCertificate = async (event, user, issuerId) => {
  // Check for existing certificate (idempotency)
  const existingCert = await Certificate.findOne({
    eventId: event._id,
    userId: user._id
  });

  if (existingCert) {
    console.log(`[CertificateService] Certificate already exists for user: ${user.name}`);
    return {
      created: false,
      certificate: existingCert
    };
  }

  // Create certificate record first (to get certificate ID)
  const certificate = new Certificate({
    eventId: event._id,
    userId: user._id,
    issuedBy: issuerId
  });

  // Generate filename
  const filename = `CERT-${event._id}-${user._id}.pdf`;
  const filePath = path.join(CERTIFICATES_DIR, filename);
  const relativeFilePath = `/uploads/certificates/${filename}`;

  // Prepare certificate data for PDF generation
  const certificateData = {
    certificateId: certificate.certificateId,
    userId: user,
    eventId: event,
    issuedBy: { _id: issuerId, name: 'Event Organizer' },
    issuedAt: certificate.issuedAt
  };

  // Generate PDF
  const pdfBuffer = await generateCertificatePDF(certificateData);

  // Save PDF to disk
  await fs.writeFile(filePath, pdfBuffer);

  // Update certificate with file path
  certificate.filePath = relativeFilePath;
  await certificate.save();

  console.log(`[CertificateService] Generated certificate for: ${user.name}`);

  return {
    created: true,
    certificate
  };
};

/**
 * Get certificate by ID with file path
 * 
 * @param {string} certificateId - Certificate ID (CERT-XXXX format)
 * @returns {Promise<Object|null>} Certificate document or null
 */
const getCertificateById = async (certificateId) => {
  return Certificate.findOne({ certificateId })
    .populate('eventId', 'title date department venue')
    .populate('userId', 'name email rollNumber department')
    .populate('issuedBy', 'name');
};

/**
 * Get all certificates for a user
 * 
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<Array>} Array of certificate documents
 */
const getUserCertificates = async (userId) => {
  return Certificate.find({ userId })
    .populate('eventId', 'title date department venue enableCertificates')
    .populate('issuedBy', 'name')
    .sort({ issuedAt: -1 });
};

/**
 * Get all certificates for an event
 * 
 * @param {string} eventId - Event's MongoDB ObjectId
 * @returns {Promise<Array>} Array of certificate documents
 */
const getEventCertificates = async (eventId) => {
  return Certificate.find({ eventId })
    .populate('userId', 'name email rollNumber department')
    .sort({ issuedAt: -1 });
};

/**
 * Get certificate statistics for an event
 * 
 * @param {string} eventId - Event's MongoDB ObjectId
 * @returns {Promise<Object>} Statistics object
 */
const getCertificateStats = async (eventId) => {
  const [certificateCount, attendanceCount] = await Promise.all([
    Certificate.countDocuments({ eventId }),
    Attendance.countDocuments({ eventId })
  ]);

  return {
    totalCertificates: certificateCount,
    totalAttendees: attendanceCount,
    pendingCertificates: attendanceCount - certificateCount
  };
};

/**
 * Ensure certificates directory exists
 */
const ensureCertificatesDirectory = async () => {
  try {
    await fs.access(CERTIFICATES_DIR);
  } catch {
    await fs.mkdir(CERTIFICATES_DIR, { recursive: true });
  }
};

/**
 * Get full file path for a certificate
 * 
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<string|null>} Full file path or null
 */
const getCertificateFilePath = async (certificateId) => {
  const certificate = await Certificate.findOne({ certificateId });
  if (!certificate || !certificate.filePath) {
    return null;
  }
  return path.join(__dirname, '../..', certificate.filePath);
};

module.exports = {
  generateCertificatesForEvent,
  generateSingleCertificate,
  getCertificateById,
  getUserCertificates,
  getEventCertificates,
  getCertificateStats,
  getCertificateFilePath
};
