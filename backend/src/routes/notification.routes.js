const express = require('express');
const { param } = require('express-validator');

const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/', authenticate, notificationController.getMyNotifications);

router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllNotificationsRead
);

router.patch(
  '/:id/read',
  authenticate,
  [param('id').isMongoId().withMessage('Notification id must be valid')],
  validateRequest,
  notificationController.markNotificationRead
);

module.exports = router;
