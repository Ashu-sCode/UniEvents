/**
 * Certificate Routes
 * Handles certificate generation and download
 */

const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { authenticate, organizerOnly } = require('../middleware/auth.middleware');

// Student routes
router.get('/my-certificates', authenticate, certificateController.getMyCertificates);
router.get('/:certificateId/download', authenticate, certificateController.downloadCertificatePDF);

// Organizer routes
router.post('/generate/:eventId', authenticate, organizerOnly, certificateController.generateCertificates);
router.get('/event/:eventId', authenticate, organizerOnly, certificateController.getEventCertificates);

module.exports = router;
