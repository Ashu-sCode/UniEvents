/**
 * Certificate Controller
 * Handles certificate generation and download
 */

const path = require('path');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate.model');
const Event = require('../models/Event.model');
const certificateService = require('../services/certificateService');
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

    // Use certificate service for generation
    const result = await certificateService.generateCertificatesForEvent(
      eventId,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        totalAttendees: result.totalAttendees,
        generated: result.generated,
        skipped: result.skipped,
        errors: result.errors
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
    const certificates = await certificateService.getUserCertificates(req.user._id);

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

    // Check if PDF file exists on disk
    if (certificate.filePath) {
      const fullPath = path.join(__dirname, '../..', certificate.filePath);
      try {
        await fs.access(fullPath);
        // File exists, send it
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=certificate-${certificate.certificateId}.pdf`
        });
        return res.sendFile(fullPath);
      } catch (err) {
        // File doesn't exist, regenerate
        console.log('Certificate file not found, regenerating...');
      }
    }

    // Generate PDF on-the-fly
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
 * @route   GET /api/certificates/:certificateId/preview
 * @desc    Preview certificate as PDF (inline for iframe viewing)
 * @access  Private
 */
const previewCertificatePDF = async (req, res, next) => {
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

    // Only certificate owner can preview
    if (certificate.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this certificate'
      });
    }

    // Check if PDF file exists on disk
    if (certificate.filePath) {
      const fullPath = path.join(__dirname, '../..', certificate.filePath);
      try {
        await fs.access(fullPath);
        // File exists, send it inline for preview
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename=certificate-${certificate.certificateId}.pdf`
        });
        return res.sendFile(fullPath);
      } catch (err) {
        console.log('Certificate file not found, regenerating...');
      }
    }

    // Generate PDF on-the-fly
    const pdfBuffer = await generateCertificatePDF(certificate);

    // Set response headers for inline PDF viewing
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=certificate-${certificate.certificateId}.pdf`,
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

    const certificates = await certificateService.getEventCertificates(eventId);
    const stats = await certificateService.getCertificateStats(eventId);

    res.json({
      success: true,
      count: certificates.length,
      data: { 
        certificates,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCertificates,
  getMyCertificates,
  downloadCertificatePDF,
  previewCertificatePDF,
  getEventCertificates
};
