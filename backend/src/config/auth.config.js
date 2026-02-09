/**
 * Authentication Configuration
 * JWT settings and role definitions
 */

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  // Fail fast (should also be enforced in server.js)
  throw new Error('JWT_SECRET is required');
}

module.exports = {
  // JWT Configuration
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'unievent'
  },

  // User Roles
  roles: {
    STUDENT: 'student',
    ORGANIZER: 'organizer'
  },

  // Password Requirements
  password: {
    minLength: 6,
    saltRounds: 10
  }
};
