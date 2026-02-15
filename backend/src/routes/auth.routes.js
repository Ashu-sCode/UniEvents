/**
 * Authentication Routes
 * Handles user registration, login, and profile
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiters');
const { stripTags } = require('../utils/sanitize');

// Validation rules
const signupValidation = [
  body('name')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  body('department')
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['student', 'organizer'])
    .withMessage('Invalid role'),
  // Roll number is required for students (matches controller behavior)
  body('rollNumber')
    .if(body('role').equals('student'))
    .trim()
    .customSanitizer(stripTags)
    .isLength({ min: 1, max: 30 })
    .withMessage('Roll number is required for students')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

const resetPasswordValidation = [
  body('password')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
];

// Routes
// Rate limit ONLY auth endpoints (do not rate-limit other APIs)
router.post('/signup', authLimiter, signupValidation, validateRequest, authController.signup);
router.post('/login', authLimiter, loginValidation, validateRequest, authController.login);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
