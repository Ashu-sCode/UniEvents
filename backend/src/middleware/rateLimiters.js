const rateLimit = require('express-rate-limit');

function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
      });
    },
  });
}

// Only for authentication endpoints
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again in a minute.',
});

module.exports = {
  authLimiter,
};
