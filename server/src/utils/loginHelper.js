const bcrypt = require('bcryptjs');
const ApiError = require('./ApiError');
const { signAccessToken, signRefreshToken } = require('./tokens');
const { USER_STATUS, MAX_LOGIN_ATTEMPTS, LOCK_TIME_MS } = require('../config/constants');

// Shared credential-check + token-issuance logic for both the manager and
// admin login endpoints. Mutates and saves `user` (login attempts, tokens).
async function verifyAndIssueTokens(user, password, { rememberMe = false } = {}) {
  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('ACCOUNT_SUSPENDED', 'Your account has been suspended');
  }
  if (user.status === USER_STATUS.INACTIVE) {
    throw ApiError.forbidden('ACCOUNT_INACTIVE', 'Your account is inactive');
  }
  if (user.isLocked()) {
    throw ApiError.unauthorized('ACCOUNT_LOCKED', 'Account locked. Try again in 30 minutes');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
    await user.save();
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  user.loginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, { rememberMe: !!rememberMe });
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-10);
  await user.save();

  return { accessToken, refreshToken };
}

module.exports = { verifyAndIssueTokens };
