/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { jwt: jwtConfig, roles } = require('../config/auth.config');

const authError = (message, statusCode = 401) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer
    });

    if (!decoded?.userId) {
      return next(authError('Invalid token payload'));
    }

    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(authError('Access revoked. User no longer exists.'));
    }

    if (!user.isActive) {
      return next(authError('Account is deactivated'));
    }

    const tokenVersion = Number(decoded.tokenVersion ?? 0);
    if (tokenVersion !== user.tokenVersion) {
      return next(authError('Session revoked. Please log in again.'));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.statusCode = 401;
      error.message = 'Session expired. Please log in again.';
    } else if (error.name === 'JsonWebTokenError') {
      error.statusCode = 401;
      error.message = 'Invalid authentication token.';
    }
    next(error);
  }
};

/**
 * Restrict access to specific roles
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Middleware to allow only organizers
 */
const organizerOnly = authorize(roles.ORGANIZER);

/**
 * Middleware to allow only students
 */
const studentOnly = authorize(roles.STUDENT);

module.exports = {
  authenticate,
  authorize,
  organizerOnly,
  studentOnly
};
