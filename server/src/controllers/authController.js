const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { verifyAndIssueTokens } = require('../utils/loginHelper');
const { AUDIT_ACTIONS, ROLES, USER_STATUS, SOCKET_EVENTS } = require('../config/constants');
const { emitToAdmins } = require('../config/socket');
const {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE
} = require('../utils/tokens');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePassword(password, email) {
  if (!PASSWORD_REGEX.test(password)) {
    throw ApiError.badRequest(
      'WEAK_PASSWORD',
      'Password must be at least 8 characters and include uppercase, lowercase, and a number'
    );
  }
  if (email && password.toLowerCase().includes(email.toLowerCase().split('@')[0])) {
    throw ApiError.badRequest('WEAK_PASSWORD', 'Password cannot contain your email address');
  }
}

// POST /auth/register (Super Admin only) - creates BRANCH_MANAGER accounts only.
// SUPER_ADMIN has no registration route; it is bootstrapped from .env (see
// config/bootstrapAdmin.js) and logs in via POST /admin/auth/login instead.
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, branchId } = req.body;

  if (!firstName || !lastName || !email || !password || !branchId) {
    throw ApiError.badRequest('MISSING_FIELDS', 'firstName, lastName, email, password, and branchId are required');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw ApiError.badRequest('INVALID_EMAIL', 'Invalid email format');
  }
  validatePassword(password, email);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.badRequest('EMAIL_EXISTS', 'Email already exists');
  }

  const branch = await Branch.findById(branchId);
  if (!branch) throw ApiError.badRequest('INVALID_BRANCH', 'Branch does not exist');

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    password: hashed,
    role: ROLES.BRANCH_MANAGER,
    branchId,
    createdBy: req.user.userId
  });

  await auditService.log({
    entityType: 'USER',
    entityId: user._id,
    action: AUDIT_ACTIONS.CREATE,
    user: req.user,
    branchId: user.branchId,
    description: `Branch manager ${user.email} created`
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: user.toSafeJSON()
  });
});

// POST /auth/signup (public) - self-service Branch Manager signup. No branchId
// is collected here: the account is created PENDING_APPROVAL with no branch,
// and a Super Admin must assign a branch and approve it (PUT /users/:id/approve)
// before the account can log in.
const signup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    throw ApiError.badRequest('MISSING_FIELDS', 'firstName, lastName, email, and password are required');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw ApiError.badRequest('INVALID_EMAIL', 'Invalid email format');
  }
  validatePassword(password, email);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.badRequest('EMAIL_EXISTS', 'Email already exists');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    password: hashed,
    role: ROLES.BRANCH_MANAGER,
    branchId: null,
    status: USER_STATUS.PENDING_APPROVAL
  });

  await auditService.log({
    entityType: 'USER',
    entityId: user._id,
    action: AUDIT_ACTIONS.CREATE,
    user: { userId: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
    branchId: null,
    description: `${user.email} self-registered and is awaiting admin approval`
  });

  emitToAdmins(SOCKET_EVENTS.MANAGER_REGISTERED, {
    userId: user._id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`
  });

  res.status(201).json({
    success: true,
    message: 'Registration submitted. An admin will review your account and assign your branch.',
    user: user.toSafeJSON()
  });
});

// POST /auth/login - BRANCH_MANAGER accounts only. Super Admin uses /admin/auth/login.
const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('MISSING_CREDENTIALS', 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } }).select(
    '+password +refreshTokens'
  );

  if (!user) {
    throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
  }
  if (user.role !== ROLES.BRANCH_MANAGER) {
    throw ApiError.forbidden('WRONG_LOGIN_ROUTE', 'Super Admin must log in via the admin login endpoint');
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

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;
  if (!refreshToken) {
    throw ApiError.unauthorized('NO_REFRESH_TOKEN', 'No refresh token provided');
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (error) {
    const code = error.name === 'TokenExpiredError' ? 'REFRESH_TOKEN_EXPIRED' : 'INVALID_REFRESH_TOKEN';
    throw ApiError.unauthorized(code, 'Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') {
    throw ApiError.unauthorized('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens');
  if (!user || !(user.refreshTokens || []).includes(refreshToken)) {
    throw ApiError.unauthorized('INVALID_REFRESH_TOKEN', 'Refresh token no longer valid');
  }
  if ((user.tokenVersion || 0) !== decoded.tokenVersion) {
    throw ApiError.unauthorized('INVALID_REFRESH_TOKEN', 'Refresh token no longer valid');
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken).concat(newRefreshToken).slice(-10);
  await user.save();

  setAuthCookies(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });

  res.json({ success: true, token: newAccessToken, refreshToken: newRefreshToken });
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;

  if (refreshToken) {
    try {
      const decoded = verifyToken(refreshToken);
      const user = await User.findById(decoded.userId).select('+refreshTokens');
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken);
        await user.save();
      }
    } catch (error) {
      // token already invalid/expired - nothing to clean up
    }
  }

  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /auth/me
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
  res.json({ success: true, user: user.toSafeJSON() });
});

// PUT /auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw ApiError.badRequest('MISSING_FIELDS', 'All password fields are required');
  }
  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('PASSWORD_MISMATCH', 'New password and confirmation do not match');
  }
  if (newPassword === currentPassword) {
    throw ApiError.badRequest('SAME_PASSWORD', 'New password must be different from current password');
  }

  const user = await User.findById(req.user.userId).select('+password +refreshTokens');
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  validatePassword(newPassword, user.email);

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordLastChanged = new Date();
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.refreshTokens = [];
  await user.save();

  clearAuthCookies(res);
  res.json({ success: true, message: 'Password changed successfully. Please login again.' });
});

// POST /auth/reset-password (Super Admin only)
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    throw ApiError.badRequest('MISSING_FIELDS', 'userId and newPassword are required');
  }

  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

  validatePassword(newPassword, user.email);

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordLastChanged = new Date();
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.refreshTokens = [];
  await user.save();

  await auditService.log({
    entityType: 'USER',
    entityId: user._id,
    action: AUDIT_ACTIONS.UPDATE,
    user: req.user,
    branchId: user.branchId,
    description: `Password reset for ${user.email} by super admin`
  });

  res.json({ success: true, message: 'Password reset. User must login with new password.' });
});

module.exports = { register, signup, login, refresh, logout, me, changePassword, resetPassword };
