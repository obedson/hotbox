require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const logger = require('./lib/logger');

// Import modular API v1 routers
const authRouter = require('./routes/auth');
const postcodesRouter = require('./routes/postcodes');
const hubsRouter = require('./routes/hubs');
const ridersRouter = require('./routes/riders');
const shipmentsRouter = require('./routes/shipments');
const custodyRouter = require('./routes/custody');
const verificationRouter = require('./routes/verification');
const operationsRouter = require('./routes/operations');
const enterpriseRouter = require('./routes/enterprise');
const walletsRouter = require('./routes/wallets');
const customerRouter = require('./routes/customer');
const notificationsRouter = require('./routes/notifications');
const paymentsRouter = require('./routes/payments');
const nipostReviewRouter = require('./routes/nipostReview');
const hubApplicationsRouter = require('./routes/hubApplications');

const app = express();

app.use(helmet());

// CORS: allow only trusted origins when CORS_ORIGINS is configured.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting: a global guard plus a stricter guard on authentication.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests, please try again later.' }
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/customer/request-otp', otpLimiter);
app.use(/^\/api\/v1\/shipments\/[^/]+\/resend-otp$/, otpLimiter);
app.use(express.json({
  // Evidence uploads travel as base64 data URLs inside JSON. A 2 MB document
  // becomes roughly 2.7 MB of JSON, so the parser must allow more than the
  // 100 kb Express default or legitimate rider KYC and legacy box-link
  // evidence is rejected with "request entity too large" before it reaches
  // the route's own 2 MB document check.
  limit: '4mb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Request logger for API auditing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') return;
    logger.info('request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip
    });
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT NOW()');
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
      dbTime: dbCheck.rows[0].now,
      version: '2.0.0-production'
    });
  } catch (err) {
    logger.error('Database health check failed', { error: err.message });
    res.status(503).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: err.message || String(err)
    });
  }
});

// Readiness endpoint for orchestrators and uptime monitors
app.get('/api/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'READY', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Readiness check failed', { error: err.message });
    res.status(503).json({ status: 'NOT_READY', timestamp: new Date().toISOString() });
  }
});

// ----------------------------------------------------------------------------
// MOUNT MODULAR API V1 ENDPOINTS
// ----------------------------------------------------------------------------
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/postcodes', postcodesRouter);
app.use('/api/v1/hubs', hubsRouter);
app.use('/api/v1/riders', ridersRouter);
app.use('/api/v1/shipments', shipmentsRouter);
app.use('/api/v1/custody', custodyRouter);
app.use('/api/v1/verification', verificationRouter);
app.use('/api/v1/operations', operationsRouter);
app.use('/api/v1/enterprise', enterpriseRouter);
app.use('/api/v1/wallets', walletsRouter);
app.use('/api/v1/customer', customerRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/nipost-review', nipostReviewRouter);
app.use('/api/v1/hub-applications', hubApplicationsRouter);

// ----------------------------------------------------------------------------
// BACKWARD COMPATIBILITY LAYER (Legacy v0 endpoints mapping to new schema)
// ----------------------------------------------------------------------------
// GET /api/postcode/:code
app.get('/api/postcode/:code', (req, res) => {
  res.redirect(307, `/api/v1/postcodes/${req.params.code}`);
});

// GET /api/dropzones/nearby
app.get('/api/dropzones/nearby', (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(307, `/api/v1/hubs/nearby?${query}`);
});

// GET /api/dropzones
app.get('/api/dropzones', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, business_name, cac_number, phone, postcode, address_text as address,
             neighbourhood, lat, lng, opening_hours, capacity, current_load, status, rating
      FROM hubs ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parcels/:tracking
app.get('/api/parcels/:tracking', (req, res) => {
  res.redirect(307, `/api/v1/shipments/track/${req.params.tracking}`);
});

// ----------------------------------------------------------------------------
// SERVE THE BUILT FRONTEND (production)
// ----------------------------------------------------------------------------
// When the frontend bundle is present (frontend/dist), serve it from this
// process so the API and web app share one URL. API routes are matched above
// and never reach this block.
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', { error: err.message });
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error occurred.' : err.message;
  res.status(status).json({ error: message });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hotbox Production API Server running on port ${PORT} (hotbox.com.ng | hotboxng.com)`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use, retrying on port ${PORT + 1}...`);
      server.listen(PORT + 1, '0.0.0.0');
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;
