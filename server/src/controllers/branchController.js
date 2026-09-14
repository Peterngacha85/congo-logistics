const Branch = require('../models/Branch');
const Trip = require('../models/Trip');
const Transporter = require('../models/Transporter');
const Truck = require('../models/Truck');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { ROLES, AUDIT_ACTIONS } = require('../config/constants');

// GET /branches
const listBranches = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query._id = req.user.branchId;
  }

  const branches = await Branch.find(query).populate('managerId', 'firstName lastName email');
  res.json({ success: true, data: branches });
});

// GET /branches/:branchId
const getBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  if (req.user.role === ROLES.BRANCH_MANAGER && branchId !== req.user.branchId) {
    throw ApiError.forbidden('CROSS_BRANCH_ACCESS', 'You can only access your assigned branch');
  }

  const branch = await Branch.findById(branchId).populate('managerId', 'firstName lastName email');
  if (!branch) throw ApiError.notFound('BRANCH_NOT_FOUND', 'Branch not found');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeTrips, monthTrips, activeTransporters, activeTrucks] = await Promise.all([
    Trip.countDocuments({ branchId, status: { $in: ['ASSIGNED', 'IN_TRANSIT'] } }),
    Trip.find({ branchId, createdAt: { $gte: startOfMonth } }),
    Transporter.countDocuments({ branchIds: branchId, status: 'ACTIVE' }),
    Truck.countDocuments({ branchId, status: 'ACTIVE' })
  ]);

  res.json({
    success: true,
    data: {
      ...branch.toObject(),
      stats: {
        activeTrips,
        totalTripsThisMonth: monthTrips.length,
        monthlyRevenue: monthTrips.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        activeTransporters,
        activeTrucks
      }
    }
  });
});

// POST /branches (Super Admin only)
const createBranch = asyncHandler(async (req, res) => {
  const { branchName, branchCode, location, address, phone, email, managerId } = req.body;

  if (!branchName || !branchCode) {
    throw ApiError.badRequest('MISSING_FIELDS', 'branchName and branchCode are required');
  }

  const existing = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
  if (existing) {
    throw ApiError.conflict('BRANCH_CODE_EXISTS', 'Branch code already exists');
  }

  const branch = await Branch.create({
    branchName,
    branchCode: branchCode.toUpperCase(),
    location,
    address,
    phone,
    email,
    managerId,
    createdBy: req.user.userId
  });

  await auditService.log({
    entityType: 'BRANCH',
    entityId: branch._id,
    action: AUDIT_ACTIONS.CREATE,
    user: req.user,
    branchId: branch._id,
    description: `Branch ${branch.branchName} created`
  });

  res.status(201).json({ success: true, message: 'Branch created successfully', data: branch });
});

// PUT /branches/:branchId
const updateBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const branch = await Branch.findById(branchId);
  if (!branch) throw ApiError.notFound('BRANCH_NOT_FOUND', 'Branch not found');

  if (req.user.role === ROLES.BRANCH_MANAGER) {
    if (branchId !== req.user.branchId) {
      throw ApiError.forbidden('CROSS_BRANCH_ACCESS', 'You can only access your assigned branch');
    }
    // Branch managers may only edit contact info, per permissions matrix
    if (req.body.phone !== undefined) branch.phone = req.body.phone;
    if (req.body.email !== undefined) branch.email = req.body.email;
  } else {
    const editableFields = ['branchName', 'location', 'address', 'phone', 'email', 'managerId', 'isActive'];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) branch[field] = req.body[field];
    });
  }

  await branch.save();

  await auditService.log({
    entityType: 'BRANCH',
    entityId: branch._id,
    action: AUDIT_ACTIONS.UPDATE,
    user: req.user,
    branchId: branch._id,
    description: `Branch ${branch.branchName} updated`
  });

  res.json({ success: true, message: 'Branch updated successfully', data: branch });
});

// DELETE /branches/:branchId (Super Admin only) - hard delete, but blocked
// while anything still references the branch to avoid orphaning data. Admin
// should reassign or deactivate (isActive: false) those first, or delete them.
const deleteBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const branch = await Branch.findById(branchId);
  if (!branch) throw ApiError.notFound('BRANCH_NOT_FOUND', 'Branch not found');

  const [tripCount, userCount, truckCount, transporterCount] = await Promise.all([
    Trip.countDocuments({ branchId }),
    User.countDocuments({ branchId, isDeleted: { $ne: true } }),
    Truck.countDocuments({ branchId }),
    Transporter.countDocuments({ branchIds: branchId })
  ]);

  const blockers = [];
  if (tripCount > 0) blockers.push(`${tripCount} trip(s)`);
  if (userCount > 0) blockers.push(`${userCount} user(s)`);
  if (truckCount > 0) blockers.push(`${truckCount} truck(s)`);
  if (transporterCount > 0) blockers.push(`${transporterCount} driver(s)`);

  if (blockers.length > 0) {
    throw ApiError.conflict(
      'BRANCH_IN_USE',
      `Cannot delete branch: still referenced by ${blockers.join(', ')}. Reassign or remove them first, or deactivate the branch instead.`
    );
  }

  await branch.deleteOne();

  await auditService.log({
    entityType: 'BRANCH',
    entityId: branch._id,
    action: AUDIT_ACTIONS.DELETE,
    user: req.user,
    branchId: branch._id,
    description: `Branch ${branch.branchName} deleted`
  });

  res.json({ success: true, message: 'Branch deleted successfully' });
});

module.exports = { listBranches, getBranch, createBranch, updateBranch, deleteBranch };
