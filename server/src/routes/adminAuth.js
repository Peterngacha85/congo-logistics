const express = require('express');
const rateLimit = require('express-rate-limit');
const adminAuthController = require('../controllers/adminAuthController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } }
});

// Admin session uses the shared /auth/refresh, /auth/logout, /auth/me endpoints
// once logged in (they're role-agnostic) - only login is a separate route.
router.post('/login', loginLimiter, adminAuthController.adminLogin);

module.exports = router;
