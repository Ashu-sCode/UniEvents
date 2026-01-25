/**
 * Event Routes
 * Handles event CRUD operations
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const eventController = require('../controllers/event.controller');
const { authenticate, organizerOnly } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');

// Validation rules
const eventValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('eventType')
    .isIn(['public', 'departmental'])
    .withMessage('Event type must be public or departmental'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('seatLimit')
    .isInt({ min: 1 })
    .withMessage('Seat limit must be at least 1'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').trim().notEmpty().withMessage('Time is required'),
  body('venue').trim().notEmpty().withMessage('Venue is required')
];

// Public routes
router.get('/', authenticate, eventController.getEvents);
router.get('/:id', eventController.getEventById);

// Protected routes (Organizer only)
router.post('/', authenticate, organizerOnly, eventValidation, validateRequest, eventController.createEvent);
router.put('/:id', authenticate, organizerOnly, eventController.updateEvent);
router.delete('/:id', authenticate, organizerOnly, eventController.deleteEvent);
router.get('/:id/registrations', authenticate, organizerOnly, eventController.getEventRegistrations);

module.exports = router;
