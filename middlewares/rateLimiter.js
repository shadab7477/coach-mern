const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Authentication / OTP dispatch (15 requests per 10 mins)
 */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please try again after 10 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * General API Rate Limiter (200 requests per 1 minute)
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded. Please slow down your requests.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
};

