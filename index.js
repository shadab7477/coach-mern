const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middlewares/error');
const { apiLimiter } = require('./middlewares/rateLimiter');

// Import Route Handlers
const authRouter = require('./routes/auth');
const coachesRouter = require('./routes/coaches');
const bookingsRouter = require('./routes/bookings');
const inquiriesRouter = require('./routes/inquiries');
const ebooksRouter = require('./routes/ebooks');
const reviewsRouter = require('./routes/reviews');
const locationRouter = require('./routes/location');
const translateRouter = require('./routes/translate');
const zoomRouter = require('./routes/zoom');
const applicationsRouter = require('./routes/applications');

const app = express();
app.set('trust proxy', 1); // Required behind Hostinger / Nginx reverse proxies for rate-limiter & HTTPS
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 1. Security & Core Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(compression());

// 2. Logging
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 3. CORS & Private Network Access Configuration
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow same-origin & configured origins cleanly
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-client-info'],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 4. Request Body Parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 5. Global Rate Limiter
app.use('/api/', apiLimiter);

// 6. Health & Meta Endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    environment: NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'CoachConnect Production REST API Gateway',
  });
});

// 7. Mount Domain API Routes
app.use('/api/auth', authRouter);
app.use('/api/coaches', coachesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/inquiries', inquiriesRouter);
app.use('/api/ebooks', ebooksRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/location', locationRouter);
app.use('/api/translate', translateRouter);
app.use('/api/zoom', zoomRouter);
app.use('/api/applications', applicationsRouter);

// API 404 Handler (only for unmatched /api/* routes)
app.use('/api', notFoundHandler);

// 8. Serve React Production Build (SPA)
const backendBuildPath = path.join(__dirname, 'build');
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
const staticBuildPath = fs.existsSync(path.join(backendBuildPath, 'index.html'))
  ? backendBuildPath
  : frontendBuildPath;

if (fs.existsSync(path.join(staticBuildPath, 'index.html'))) {
  app.use(express.static(staticBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      service: 'CoachConnect API Server',
      healthCheck: '/api/health',
      version: '2.0.0',
    });
  });
}

// 9. Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// 9. Server Bootstrap
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Express Production] CoachConnect Server listening on port ${PORT} (${NODE_ENV})`);
    console.log(`[Express Production] Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
