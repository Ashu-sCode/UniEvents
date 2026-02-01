/**
 * Certificate Controller
 * Handles certificate generation and download
 */

const Certificate = require('../models/Certificate.model');
const Event = require('../models/Event.model');
const certificateService = require('../services/certificateService');
const fileStorageService = require('../services/fileStorageService');
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

    // If stored in GridFS, stream it
    if (certificate.pdfFileId) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=certificate-${certificate.certificateId}.pdf`
      });

      const stream = fileStorageService.openDownloadStream({
        bucket: 'certificates',
        fileId: certificate.pdfFileId
      });

      stream.on('error', (err) => next(err));
      return stream.pipe(res);
    }

    // Generate PDF on-the-fly (fallback)
    const pdfBuffer = await generateCertificatePDF(certificate);

    // Optional backfill: store into GridFS so future requests stream
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
      // Do not fail download if storage fails
      console.error('Failed to store generated certificate in GridFS:', storeErr);
    }

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

    // If stored in GridFS, stream it
    if (certificate.pdfFileId) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=certificate-${certificate.certificateId}.pdf`
      });

      const stream = fileStorageService.openDownloadStream({
        bucket: 'certificates',
        fileId: certificate.pdfFileId
      });

      stream.on('error', (err) => next(err));
      return stream.pipe(res);
    }

    // Generate PDF on-the-fly (fallback)
    const pdfBuffer = await generateCertificatePDF(certificate);

    // Optional backfill into GridFS
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
      console.error('Failed to store generated certificate in GridFS:', storeErr);
    }

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
