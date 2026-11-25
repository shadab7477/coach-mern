/**
 * Request Body Validation Helper Middleware
 * @param {string[]} requiredFields
 */
function validateBody(requiredFields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a valid JSON object.',
        code: 'INVALID_BODY',
      });
    }

    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required field(s): ${missing.join(', ')}`,
        code: 'VALIDATION_ERROR',
        details: { missingFields: missing },
      });
    }

    next();
  };
}

module.exports = {
  validateBody,
};

