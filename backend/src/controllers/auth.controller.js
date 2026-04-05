/**
 * Authentication Controller
 * Handles user registration and login
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const { approvalStatuses } = require('../models/User.model');
const { jwt: jwtConfig, roles } = require('../config/auth.config');
const { sendPasswordResetEmail } = require('../services/emailService');
const imageService = require('../services/imageService');

/**
 * Generate JWT token for user
 * @param {Object} user - User document
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
      approvalStatus: user.approvalStatus || approvalStatuses.APPROVED
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn, issuer: jwtConfig.issuer }
  );
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (student or organizer)
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, rollNumber, department, role } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate role
    const userRole = role === roles.ORGANIZER ? roles.ORGANIZER : roles.STUDENT;

    // For students, roll number is required
    if (userRole === roles.STUDENT && !rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is required for students'
      });
    }

    if (userRole === roles.STUDENT && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Student ID card is required for approval'
      });
    }

    // Create new user
    const user = new User({
      name,
      email: normalizedEmail,
      password,
      rollNumber: userRole === roles.STUDENT ? rollNumber : null,
      department,
      role: userRole,
      approvalStatus: approvalStatuses.PENDING,
      idCardFileId: null,
      idCardUrl: null
    });

    if (userRole === roles.STUDENT && req.file) {
      try {
        const idCardResult = await imageService.processIdCard(
          req.file.buffer,
          user._id.toString(),
          req.file.mimetype
        );
        user.idCardFileId = idCardResult.fileId;
        user.idCardUrl = '/api/users/me/id-card';
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: 'Unable to process student ID card. Please try again.'
        });
      }
    }

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration submitted for admin approval',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message:
        user.approvalStatus === approvalStatuses.APPROVED
          ? 'Login successful'
          : user.approvalStatus === approvalStatuses.REJECTED
            ? 'Account review completed'
            : 'Account pending admin approval',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { user: req.user.toPublicJSON() }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link (generic response)
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Always return generic response to avoid user enumeration
    const generic = {
      success: true,
      message: 'If the account exists, a password reset link has been sent.'
    };

    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });

    if (!user || !user.isActive) {
      return res.json(generic);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresMinutes = Number(process.env.RESET_PASSWORD_EXPIRES_MINUTES || 30);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expiresAt;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (e) {
      // Don't leak internal details; just log.
      console.error('Error sending password reset email:', e);
    }

    return res.json(generic);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using a valid token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  forgotPassword,
  resetPassword
};
