const jwt = require('jsonwebtoken');

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      branchId: user.branchId ? user.branchId.toString() : null
    },
    process.env.JWT_SECRET,
    { expiresIn: Number(process.env.JWT_EXPIRE_TIME) || 86400 }
  );
}

function signRefreshToken(user, { rememberMe = false } = {}) {
  const expiresIn = rememberMe
    ? Number(process.env.JWT_REFRESH_EXPIRE_TIME_REMEMBER) || 2592000
    : Number(process.env.JWT_REFRESH_EXPIRE_TIME) || 604800;

  return jwt.sign(
    {
      userId: user._id.toString(),
      type: 'refresh',
      tokenVersion: user.tokenVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

const ACCESS_COOKIE = 'auth_token';
const REFRESH_COOKIE = 'refresh_token';

function setAuthCookies(res, { accessToken, refreshToken, rememberMe = false }) {
  const isProd = process.env.NODE_ENV === 'production';
  const refreshMaxAge = rememberMe
    ? (Number(process.env.JWT_REFRESH_EXPIRE_TIME_REMEMBER) || 2592000) * 1000
    : (Number(process.env.JWT_REFRESH_EXPIRE_TIME) || 604800) * 1000;

  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: (Number(process.env.JWT_EXPIRE_TIME) || 86400) * 1000
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: refreshMaxAge
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE
};
