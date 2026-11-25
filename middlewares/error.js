/**
 * Async Handler wrapper to avoid unhandled promise rejections in Express routes
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found Middleware
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' not found on this server.`,
    code: 'ROUTE_NOT_FOUND',
  });
}

/**
 * Central Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const status = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler,
};

