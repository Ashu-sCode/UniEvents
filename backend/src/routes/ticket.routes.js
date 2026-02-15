/**
 * Ticket Routes
 * Handles ticket registration, verification, and download
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ticketController = require('../controllers/ticket.controller');
const { authenticate, organizerOnly, studentOnly } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');

// Student routes
router.post('/register/:eventId', authenticate, studentOnly, ticketController.registerForEvent);

// Backward compatible: existing endpoint
router.get('/my-tickets', authenticate, ticketController.getMyTickets);
// New alias for pagination requirement: GET /api/tickets?page=&limit=
router.get('/', authenticate, ticketController.getMyTickets);

router.get('/:ticketId', authenticate, ticketController.getTicketById);
router.get('/:ticketId/download', authenticate, ticketController.downloadTicketPDF);
router.get('/:ticketId/preview', authenticate, ticketController.previewTicketPDF);

// Organizer routes - QR verification at event entry
router.post(
  '/verify',
  authenticate,
  organizerOnly,
  [
    body('ticketId').trim().notEmpty().isLength({ max: 40 }).withMessage('ticketId is required'),
    body('eventId').isMongoId().withMessage('eventId must be a valid id'),
  ],
  validateRequest,
  ticketController.verifyTicket
);

// Organizer routes - manage registrations
router.patch(
  '/:ticketId/cancel',
  authenticate,
  organizerOnly,
  [param('ticketId').trim().notEmpty().isLength({ max: 40 }).withMessage('ticketId is required')],
  validateRequest,
  ticketController.cancelTicket
);

module.exports = router;
