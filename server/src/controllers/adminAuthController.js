const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAndIssueTokens } = require('../utils/loginHelper');
const { setAuthCookies } = require('../utils/tokens');
const { ROLES } = require('../config/constants');

// POST /admin/auth/login
// Separate route from manager login: the Super Admin account is a single,
// env-sourced identity (see config/bootstrapAdmin.js), not a DB record created
// via public registration. Kept distinct so manager and admin sessions never
// share a login surface.
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('MISSING_CREDENTIALS', 'Email and password are required');
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    role: ROLES.SUPER_ADMIN,
    isDeleted: { $ne: true }
  }).select('+password +refreshTokens');

  if (!user) {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const { accessToken, refreshToken } = await verifyAndIssueTokens(user, password, { rememberMe: !!rememberMe });
  setAuthCookies(res, { accessToken, refreshToken, rememberMe: !!rememberMe });

  res.json({
    success: true,
    message: 'Login successful',
    token: accessToken,
    refreshToken,
    user: user.toSafeJSON()
  });
});

module.exports = { adminLogin };
