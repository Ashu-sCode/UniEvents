/**
 * Certificate Controller
 * Handles certificate generation and download
 */

const Certificate = require('../models/Certificate.model');
const Event = require('../models/Event.model');
const Attendance = require('../models/Attendance.model');
const { generateCertificatePDF } = require('../utils/pdfGenerator');

/**
 * @route   POST /api/certificates/generate/:eventId
 * @desc    Generate certificates for all attendees of an event
 * @access  Private (Organizer only)
 */
const generateCertificates = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Verify ownership
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate certificates for this event'
      });
    }

    // Check if certificates are enabled for this event
    if (!event.enableCertificates) {
      return res.status(400).json({
        success: false,
        message: 'Certificates are not enabled for this event'
      });
    }

    // Check if event is completed
    if (event.status !== Event.EVENT_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Certificates can only be generated after event completion'
      });
    }

    // Get all attendees
    const attendees = await Attendance.find({ eventId }).populate('userId');

    if (attendees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No attendees found for this event'
      });
    }

    // Generate certificates for each attendee
    const certificates = [];
    for (const attendance of attendees) {
      // Check if certificate already exists
      const existingCert = await Certificate.findOne({
        eventId,
        userId: attendance.userId._id
      });

      if (!existingCert) {
        const cert = await Certificate.create({
          eventId,
          userId: attendance.userId._id,
          issuedBy: req.user._id
        });
        certificates.push(cert);
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${certificates.length} new certificates`,
      data: {
        totalAttendees: attendees.length,
        newCertificates: certificates.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/certificates/my-certificates
 * @desc    Get all certificates for current user
 * @access  Private
 */
const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ userId: req.user._id })
      .populate('eventId', 'title date department')
      .populate('issuedBy', 'name')
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      count: certificates.length,
      data: { certificates }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/certificates/:certificateId/download
 * @desc    Download certificate as PDF
 * @access  Private
 */
const downloadCertificatePDF = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId
    })
      .populate('eventId')
      .populate('userId', 'name rollNumber department')
      .populate('issuedBy', 'name department');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Only certificate owner can download
    if (certificate.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this certificate'
      });
    }

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF(certificate);

    // Set response headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=certificate-${certificate.certificateId}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/certificates/event/:eventId
 * @desc    Get all certificates for an event
 * @access  Private (Organizer only)
 */
const getEventCertificates = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const certificates = await Certificate.find({ eventId })
      .populate('userId', 'name email rollNumber department')
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      count: certificates.length,
      data: { certificates }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCertificates,
  getMyCertificates,
  downloadCertificatePDF,
  getEventCertificates
};
