/**
 * Authentication Configuration
 * JWT settings and role definitions
 */

module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
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
