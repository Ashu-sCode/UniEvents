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
const { eventBannerUpload, handleUploadError } = require('../middleware/uploadMiddleware');
const { stripTags } = require('../utils/sanitize');

// Validation rules
const createEventValidation = [
  body('title')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),
  body('description')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 10, max: 4000 })
    .withMessage('Description must be between 10 and 4000 characters'),
  body('eventType')
    .isIn(['public', 'departmental'])
    .withMessage('Event type must be public or departmental'),
  body('department')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('seatLimit')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Seat limit must be a positive integer'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 1, max: 20 })
    .withMessage('Time is required'),
  body('venue')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 200 })
    .withMessage('Venue must be between 2 and 200 characters'),
  body('enableCertificates')
    .optional()
    .isBoolean()
    .withMessage('enableCertificates must be boolean')
];

const updateEventValidation = [
  body('title')
    .optional()
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),
  body('description')
    .optional()
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 10, max: 4000 })
    .withMessage('Description must be between 10 and 4000 characters'),
  body('eventType')
    .optional()
    .isIn(['public', 'departmental'])
    .withMessage('Event type must be public or departmental'),
  body('department')
    .optional()
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('seatLimit')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Seat limit must be a positive integer'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('time')
    .optional()
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 1, max: 20 })
    .withMessage('Time is required'),
  body('venue')
    .optional()
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 200 })
    .withMessage('Venue must be between 2 and 200 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('enableCertificates')
    .optional()
    .isBoolean()
    .withMessage('enableCertificates must be boolean')
];

// Public routes
router.get('/', authenticate, eventController.getEvents);
router.get('/:id', eventController.getEventById);

// Protected routes (Organizer only)
// Create event with optional banner image upload
router.post('/', 
  authenticate, 
  organizerOnly, 
  eventBannerUpload.single('banner'),
  handleUploadError,
  createEventValidation,
  validateRequest,
  eventController.createEvent
);

// Update event with optional banner image upload
router.put('/:id', 
  authenticate, 
  organizerOnly, 
  eventBannerUpload.single('banner'),
  handleUploadError,
  updateEventValidation,
  validateRequest,
  eventController.updateEvent
);

router.delete('/:id', authenticate, organizerOnly, eventController.deleteEvent);
router.get('/:id/registrations', authenticate, organizerOnly, eventController.getEventRegistrations);

module.exports = router;
