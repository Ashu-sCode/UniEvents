/**
 * User Routes
 * Profile endpoints for the authenticated user
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');
const { profilePhotoUpload, handleUploadError } = require('../middleware/uploadMiddleware');

const updateMeValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage('Phone must be a valid phone number'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters')
];

router.get('/me', authenticate, userController.getMe);

// Supports JSON updates OR multipart/form-data when uploading a photo.
router.put(
  '/me',
  authenticate,
  profilePhotoUpload.single('photo'),
  handleUploadError,
  updateMeValidation,
  validateRequest,
  userController.updateMe
);

module.exports = router;
