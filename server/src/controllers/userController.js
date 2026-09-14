const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { ROLES, AUDIT_ACTIONS, USER_STATUS, SOCKET_EVENTS } = require('../config/constants');
const { emitToAdmins, emitToUser } = require('../config/socket');

// GET /users
const listUsers = asyncHandler(async (req, res) => {
  const query = { isDeleted: { $ne: true } };
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query.branchId = req.user.branchId;
  }
  if (req.query.status) {
    query.status = req.query.status;
  }

  const users = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: users.map((u) => u.toSafeJSON()) });
});

// GET /users/:userId
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || user.isDeleted) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

  if (req.user.role === ROLES.BRANCH_MANAGER && user.branchId?.toString() !== req.user.branchId) {
    throw ApiError.forbidden('CROSS_BRANCH_ACCESS', "You don't have access to this data");
  }

  res.json({ success: true, data: user.toSafeJSON() });
});

// PUT /users/:userId (Super Admin only)
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || user.isDeleted) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

  const editableFields = ['firstName', 'lastName', 'phone', 'role', 'branchId', 'status'];
  const changes = {};
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined && String(req.body[field]) !== String(user[field])) {
      changes[field] = { oldValue: user[field], newValue: req.body[field] };
      user[field] = req.body[field];
    }
  });

  await user.save();

  await auditService.log({
    entityType: 'USER',
    entityId: user._id,
    action: AUDIT_ACTIONS.UPDATE,
    user: req.user,
    branchId: user.branchId,
    description: `User ${user.email} updated`,
    changes
  });

  res.json({ success: true, message: 'User updated successfully', data: user.toSafeJSON() });
});

// PUT /users/:userId/approve (Super Admin only) - approves a self-registered
// manager (status PENDING_APPROVAL) by assigning their branch and activating.
const approveUser = asyncHandler(async (req, res) => {
  const { branchId } = req.body;
  const user = await User.findById(req.params.userId);
  if (!user || user.isDeleted) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

  if (user.status !== USER_STATUS.PENDING_APPROVAL) {
    throw ApiError.badRequest('NOT_PENDING', 'Only accounts awaiting approval can be approved');
  }
  if (!branchId) {
    throw ApiError.badRequest('MISSING_BRANCH', 'branchId is required to approve this account');
  }

  const branch = await Branch.findById(branchId);
  if (!branch) throw ApiError.badRequest('INVALID_BRANCH', 'Branch does not exist');

  user.branchId = branchId;
  user.status = USER_STATUS.ACTIVE;
  await user.save();

  await auditService.log({
    entityType: 'USER',
    entityId: user._id,
    action: AUDIT_ACTIONS.APPROVE,
    user: req.user,
    branchId: user.branchId,
    description: `${user.email} approved and assigned to ${branch.branchName}`
  });

  emitToAdmins(SOCKET_EVENTS.MANAGER_APPROVED, { userId: user._id, email: user.email });
  emitToUser(user._id, SOCKET_EVENTS.MANAGER_APPROVED, { branchId: branch._id, branchName: branch.branchName });

  res.json({ success: true, message: 'User approved successfully', data: user.toSafeJSON() });
});

// DELETE /users/:userId (Super Admin only) - soft delete. Also used to reject
// a self-registered manager still in PENDING_APPROVAL.
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || user.isDeleted) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

  const wasPending = user.status === USER_STATUS.PENDING_APPROVAL;

  user.isDeleted = true;
  user.status = 'INACTIVE';
  user.refreshTokens = [];
  await user.save();

  await auditService.log({
    entityType: 'USER',
    entityId: user._id,
    action: AUDIT_ACTIONS.DELETE,
    user: req.user,
    branchId: user.branchId,
    description: `User ${user.email} deactivated`
  });

  if (wasPending) {
    emitToAdmins(SOCKET_EVENTS.MANAGER_REJECTED, { userId: user._id, email: user.email });
    emitToUser(user._id, SOCKET_EVENTS.MANAGER_REJECTED, {});
  }

  res.json({ success: true, message: 'User deleted successfully' });
});

module.exports = { listUsers, getUser, updateUser, approveUser, deleteUser };
