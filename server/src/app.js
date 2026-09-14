const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const tripRoutes = require('./routes/trips');
const branchRoutes = require('./routes/branches');
const userRoutes = require('./routes/users');
const invoiceRoutes = require('./routes/invoices');
const reportRoutes = require('./routes/reports');
const auditLogRoutes = require('./routes/auditlogs');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.use(
    '/api/v1',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: dbState === 'connected' ? 'ok' : 'error',
      timestamp: new Date(),
      uptime: process.uptime(),
      database: dbState
    });
  });

  app.use('/invoices', express.static(path.join(__dirname, '..', 'invoices')));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin/auth', adminAuthRoutes);
  app.use('/api/v1/trips', tripRoutes);
  app.use('/api/v1/branches', branchRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/auditlogs', auditLogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
