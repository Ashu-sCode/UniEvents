/**
 * Ticket Routes
 * Handles ticket registration, verification, and download
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authenticate, organizerOnly, studentOnly } = require('../middleware/auth.middleware');

// Student routes
router.post('/register/:eventId', authenticate, studentOnly, ticketController.registerForEvent);
router.get('/my-tickets', authenticate, ticketController.getMyTickets);
router.get('/:ticketId', authenticate, ticketController.getTicketById);
router.get('/:ticketId/download', authenticate, ticketController.downloadTicketPDF);
router.get('/:ticketId/preview', authenticate, ticketController.previewTicketPDF);

// Organizer routes - QR verification at event entry
router.post('/verify', authenticate, organizerOnly, ticketController.verifyTicket);

module.exports = router;
