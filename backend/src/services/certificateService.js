/**
 * Certificate Service
 *
 * Handles automatic certificate generation for completed events.
 * - Stores PDFs in MongoDB GridFS (no filesystem writes)
 * - Ensures idempotency (one certificate per user per event)
 */

const Certificate = require('../models/Certificate.model');
const Event = require('../models/Event.model');
const Attendance = require('../models/Attendance.model');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const fileStorageService = require('./fileStorageService');
const logger = require('../utils/logger');

const certificateError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Generate certificates for all attendees of an event
 * Called automatically when event status changes to 'completed'
 *
 * @param {string} eventId - MongoDB ObjectId of the event
 * @param {string} issuerId - MongoDB ObjectId of the organizer issuing certificates
 * @returns {Promise<Object>} Result with count of certificates generated
 */
const generateCertificatesForEvent = async (eventId, issuerId) => {
  const startedAt = Date.now();
  try {
    // Fetch event with validation
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if certificates are enabled for this event
    if (!event.enableCertificates) {
      logger.info('certificate.generation.skipped.disabled', {
        eventId: event._id.toString(),
        eventTitle: event.title,
        issuerId: issuerId?.toString?.() || issuerId,
      });
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

    // Get all attendees for this event
    const attendees = await Attendance.find({ eventId })
      .populate('userId', 'name email rollNumber department');

    if (attendees.length === 0) {
      logger.warn('certificate.generation.skipped.no_attendees', {
        eventId: event._id.toString(),
        eventTitle: event.title,
        issuerId: issuerId?.toString?.() || issuerId,
      });
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
        logger.error('certificate.generation.single.failed', {
          eventId: event._id.toString(),
          eventTitle: event.title,
          issuerId: issuerId?.toString?.() || issuerId,
          userId: attendance.userId._id.toString(),
          error: err,
        });
        errors.push({
          userId: attendance.userId._id,
          error: err.message
        });
      }
    }

    logger.info('certificate.generation.completed', {
      eventId: event._id.toString(),
      eventTitle: event.title,
      issuerId: issuerId?.toString?.() || issuerId,
      generated,
      skipped,
      totalAttendees: attendees.length,
      errorCount: errors.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      success: true,
      message: `Certificate generation complete`,
      generated,
      skipped,
      totalAttendees: attendees.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    logger.error('certificate.generation.failed', {
      eventId: eventId?.toString?.() || eventId,
      issuerId: issuerId?.toString?.() || issuerId,
      durationMs: Date.now() - startedAt,
      error,
    });
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
    logger.info('certificate.generation.single.skipped_existing', {
      eventId: event._id.toString(),
      userId: user._id.toString(),
      certificateId: existingCert.certificateId,
    });
    return {
      created: false,
      certificate: existingCert
    };
  }

  // Create certificate record first (to get certificateId)
  const certificate = new Certificate({
    eventId: event._id,
    userId: user._id,
    issuedBy: issuerId
  });

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

  // Store PDF in GridFS
  const filename = `certificate-${certificate.certificateId}.pdf`;
  const { fileId } = await fileStorageService.saveBuffer({
    bucket: 'certificates',
    filename,
    contentType: 'application/pdf',
    buffer: pdfBuffer,
    metadata: {
      kind: 'certificate',
      eventId: event._id.toString(),
      userId: user._id.toString(),
      certificateId: certificate.certificateId
    }
  });

  // Persist GridFS reference (no local filePath)
  certificate.pdfFileId = fileId;
  certificate.filePath = null;
  await certificate.save();

  logger.info('certificate.generation.single.completed', {
    eventId: event._id.toString(),
    userId: user._id.toString(),
    issuerId: issuerId?.toString?.() || issuerId,
    certificateId: certificate.certificateId,
    fileId: certificate.pdfFileId?.toString?.() || certificate.pdfFileId,
  });

  return {
    created: true,
    certificate
  };
};

/**
 * Get certificate by ID
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

const getOwnedCertificateById = async (certificateId, ownerUserId) => {
  const certificate = await Certificate.findOne({ certificateId })
    .populate('eventId')
    .populate('userId', 'name rollNumber department')
    .populate('issuedBy', 'name department');

  if (!certificate) {
    throw certificateError('Certificate not found', 404);
  }

  if (certificate.userId._id.toString() !== ownerUserId.toString()) {
    throw certificateError('Not authorized to access this certificate', 403);
  }

  return certificate;
};

const backfillCertificatePdf = async (certificate, pdfBuffer) => {
  const filename = `certificate-${certificate.certificateId}.pdf`;

  try {
    const { fileId } = await fileStorageService.saveBuffer({
      bucket: 'certificates',
      filename,
      contentType: 'application/pdf',
      buffer: pdfBuffer,
      metadata: {
        kind: 'certificate',
        certificateId: certificate.certificateId,
        eventId: certificate.eventId?._id?.toString(),
        userId: certificate.userId?._id?.toString()
      }
    });

    certificate.pdfFileId = fileId;
    certificate.filePath = null;
    await certificate.save();
  } catch (storeErr) {
    logger.error('certificate.gridfs.backfill.failed', {
      certificateId: certificate.certificateId,
      eventId: certificate.eventId?._id?.toString?.() || certificate.eventId?.toString?.(),
      userId: certificate.userId?._id?.toString?.() || certificate.userId?.toString?.(),
      error: storeErr,
    });
  }
};

const prepareCertificatePdf = async ({ certificateId, ownerUserId, disposition }) => {
  const certificate = await getOwnedCertificateById(certificateId, ownerUserId);
  const headers = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename=certificate-${certificate.certificateId}.pdf`
  };

  if (certificate.pdfFileId) {
    return {
      certificate,
      headers,
      stream: fileStorageService.openDownloadStream({
        bucket: 'certificates',
        fileId: certificate.pdfFileId
      })
    };
  }

  const pdfBuffer = await generateCertificatePDF(certificate);
  await backfillCertificatePdf(certificate, pdfBuffer);

  return {
    certificate,
    headers: {
      ...headers,
      'Content-Length': pdfBuffer.length
    },
    buffer: pdfBuffer
  };
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

module.exports = {
  generateCertificatesForEvent,
  generateSingleCertificate,
  getCertificateById,
  getOwnedCertificateById,
  getUserCertificates,
  getEventCertificates,
  getCertificateStats,
  prepareCertificatePdf
};
