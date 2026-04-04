/**
 * Certificate Controller
 * Handles certificate generation and download
 */

const Event = require('../models/Event.model');
const certificateService = require('../services/certificateService');

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
    const pdf = await certificateService.prepareCertificatePdf({
      certificateId: req.params.certificateId,
      ownerUserId: req.user._id,
      disposition: 'attachment'
    });

    res.set(pdf.headers);
    if (pdf.stream) {
      pdf.stream.on('error', (err) => next(err));
      return pdf.stream.pipe(res);
    }

    res.send(pdf.buffer);
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
    const pdf = await certificateService.prepareCertificatePdf({
      certificateId: req.params.certificateId,
      ownerUserId: req.user._id,
      disposition: 'inline'
    });

    res.set(pdf.headers);
    if (pdf.stream) {
      pdf.stream.on('error', (err) => next(err));
      return pdf.stream.pipe(res);
    }

    res.send(pdf.buffer);
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
