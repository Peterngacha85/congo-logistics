const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { ROLES, AUDIT_ACTIONS } = require('../config/constants');

// GET /users
const listUsers = asyncHandler(async (req, res) => {
  const query = { isDeleted: { $ne: true } };
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query.branchId = req.user.branchId;
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

// DELETE /users/:userId (Super Admin only) - soft delete
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || user.isDeleted) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

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

  res.json({ success: true, message: 'User deleted successfully' });
});

module.exports = { listUsers, getUser, updateUser, deleteUser };
