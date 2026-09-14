const { verifyToken, ACCESS_COOKIE } = require('../utils/tokens');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(ApiError.unauthorized('NO_AUTH_TOKEN', 'Authentication required. Please log in.'));
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.type === 'refresh') {
      return next(ApiError.unauthorized('INVALID_TOKEN', 'Invalid session token'));
    }
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
      branchId: decoded.branchId
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('TOKEN_EXPIRED', 'Session expired. Please log in again'));
    }
    return next(ApiError.unauthorized('INVALID_TOKEN', 'Invalid session token'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('INSUFFICIENT_PERMISSION', "You don't have permission to perform this action"));
    }
    next();
  };
}

// Scopes branch-filtered requests: branch managers are pinned to their own branch,
// and cannot query/create/read another branch's data via query or body.
function requireOwnBranch(req, res, next) {
  if (req.user.role === ROLES.SUPER_ADMIN) return next();

  const requestedBranchId = req.query.branchId || req.body.branchId || req.params.branchId;

  if (requestedBranchId && requestedBranchId !== req.user.branchId) {
    return next(ApiError.forbidden('CROSS_BRANCH_ACCESS', 'You can only access your assigned branch'));
  }
  next();
}

module.exports = { requireAuth, requireRole, requireOwnBranch };
