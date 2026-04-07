const express = require('express');
const { body, param, query } = require('express-validator');

const adminController = require('../controllers/admin.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');
const { roles } = require('../config/auth.config');
const { approvalStatuses } = require('../models/User.model');
const { stripTags } = require('../utils/sanitize');
const { handleUploadError } = require('../middleware/uploadMiddleware');

const router = express.Router();

const listUsersValidation = [
  query('role')
    .optional()
    .isIn(['all', roles.STUDENT, roles.ORGANIZER, roles.ADMIN])
    .withMessage('Invalid role filter'),
  query('approvalStatus')
    .optional()
    .isIn(['all', approvalStatuses.PENDING, approvalStatuses.APPROVED, approvalStatuses.REJECTED])
    .withMessage('Invalid approval status filter'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user id'),
];

const eventIdValidation = [
  param('eventId')
    .isMongoId()
    .withMessage('Invalid event id'),
];

const rejectValidation = [
  ...userIdValidation,
  body('reason')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 5, max: 300 })
    .withMessage('Rejection reason must be between 5 and 300 characters'),
];

const activeStateValidation = [
  ...userIdValidation,
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const eventListValidation = [
  query('status')
    .optional()
    .isIn(['all', 'draft', 'published', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status filter'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

const moderateEventValidation = [
  ...eventIdValidation,
  body('status')
    .isIn(['draft', 'published', 'cancelled'])
    .withMessage('Invalid moderated status'),
  body('reason')
    .optional({ checkFalsy: true })
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 3, max: 300 })
    .withMessage('Reason must be between 3 and 300 characters'),
];

const announcementValidation = [
  body('title')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 3, max: 140 })
    .withMessage('Title must be between 3 and 140 characters'),
  body('message')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 5, max: 500 })
    .withMessage('Message must be between 5 and 500 characters'),
  body('targetRole')
    .optional()
    .isIn(['all', roles.STUDENT, roles.ORGANIZER, roles.ADMIN])
    .withMessage('Invalid target role'),
  body('department')
    .optional({ checkFalsy: true })
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('link')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Link must be 200 characters or less'),
];

router.use(authenticate, adminOnly);

router.get('/summary', adminController.getSummary);
router.get('/events', eventListValidation, validateRequest, adminController.listEvents);
router.get('/events/:eventId', eventIdValidation, validateRequest, adminController.getEventDetail);
router.get('/users', listUsersValidation, validateRequest, adminController.listUsers);
router.get('/users/:userId', userIdValidation, validateRequest, adminController.getUserDetail);
router.get('/users/:userId/id-card', userIdValidation, validateRequest, adminController.streamUserIdCard);
router.post('/users/:userId/approve', userIdValidation, validateRequest, adminController.approveUser);
router.post('/users/:userId/reject', rejectValidation, validateRequest, adminController.rejectUser);
router.patch('/users/:userId/active-state', activeStateValidation, validateRequest, adminController.updateUserActiveState);
router.patch('/events/:eventId/status', moderateEventValidation, validateRequest, adminController.moderateEventStatus);
router.post('/announcements', announcementValidation, validateRequest, adminController.sendAnnouncement);

module.exports = router;
