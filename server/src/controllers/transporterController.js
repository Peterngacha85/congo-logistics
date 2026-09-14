const Transporter = require('../models/Transporter');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { ROLES, AUDIT_ACTIONS, SOCKET_EVENTS } = require('../config/constants');
const { emitToAdmins } = require('../config/socket');

// GET /transporters
// Same visibility rule as trucks: managers see APPROVED transporters usable
// by their branch (branchIds includes theirs, or empty = company-wide) plus
// their own pending submissions; admins see everything (optionally filtered).
const listTransporters = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query = {
      $or: [
        {
          approvalStatus: 'APPROVED',
          $or: [{ branchIds: req.user.branchId }, { branchIds: { $size: 0 } }]
        },
        { createdBy: req.user.userId }
      ]
    };
  } else if (req.query.approvalStatus) {
    query.approvalStatus = req.query.approvalStatus;
  }

  if (req.query.search) {
    const searchClause = { name: { $regex: req.query.search, $options: 'i' } };
    query = Object.keys(query).length ? { $and: [query, searchClause] } : searchClause;
  }

  const transporters = await Transporter.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: transporters });
});

// POST /transporters - any authenticated user. Admin submissions are
// auto-approved; manager submissions start PENDING_APPROVAL, scoped to their branch.
const createTransporter = asyncHandler(async (req, res) => {
  const { name, phone, email, licenseNumber, city, region, bankName, bankAccount, mobileMoneyNumber, branchIds } =
    req.body;

  if (!name) {
    throw ApiError.badRequest('MISSING_FIELDS', 'name is required');
  }

  const isAdmin = req.user.role === ROLES.SUPER_ADMIN;
  const resolvedBranchIds = isAdmin ? branchIds || [] : [req.user.branchId];

  const transporter = await Transporter.create({
    name,
    phone,
    email,
    licenseNumber,
    city,
    region,
    bankName,
    bankAccount,
    mobileMoneyNumber,
    branchIds: resolvedBranchIds,
    approvalStatus: isAdmin ? 'APPROVED' : 'PENDING_APPROVAL',
    createdBy: req.user.userId
  });

  await auditService.log({
    entityType: 'TRANSPORTER',
    entityId: transporter._id,
    action: AUDIT_ACTIONS.CREATE,
    user: req.user,
    branchId: resolvedBranchIds[0] || null,
    description: `Driver/Transporter ${transporter.name} added${isAdmin ? '' : ' (pending approval)'}`
  });

  if (!isAdmin) {
    emitToAdmins(SOCKET_EVENTS.TRANSPORTER_REGISTERED, { transporterId: transporter._id, name: transporter.name });
  }

  res.status(201).json({ success: true, message: 'Driver added successfully', data: transporter });
});

// PUT /transporters/:transporterId (Super Admin only)
const updateTransporter = asyncHandler(async (req, res) => {
  const transporter = await Transporter.findById(req.params.transporterId);
  if (!transporter) throw ApiError.notFound('TRANSPORTER_NOT_FOUND', 'Driver not found');

  const editableFields = [
    'name',
    'phone',
    'email',
    'licenseNumber',
    'city',
    'region',
    'bankName',
    'bankAccount',
    'mobileMoneyNumber',
    'branchIds',
    'status'
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) transporter[field] = req.body[field];
  });

  await transporter.save();

  await auditService.log({
    entityType: 'TRANSPORTER',
    entityId: transporter._id,
    action: AUDIT_ACTIONS.UPDATE,
    user: req.user,
    description: `Driver/Transporter ${transporter.name} updated`
  });

  res.json({ success: true, message: 'Driver updated successfully', data: transporter });
});

// PUT /transporters/:transporterId/approve (Super Admin only)
const approveTransporter = asyncHandler(async (req, res) => {
  const transporter = await Transporter.findById(req.params.transporterId);
  if (!transporter) throw ApiError.notFound('TRANSPORTER_NOT_FOUND', 'Driver not found');

  if (transporter.approvalStatus !== 'PENDING_APPROVAL') {
    throw ApiError.badRequest('NOT_PENDING', 'Only drivers awaiting approval can be approved');
  }

  transporter.approvalStatus = 'APPROVED';
  await transporter.save();

  await auditService.log({
    entityType: 'TRANSPORTER',
    entityId: transporter._id,
    action: AUDIT_ACTIONS.APPROVE,
    user: req.user,
    description: `Driver/Transporter ${transporter.name} approved`
  });

  emitToAdmins(SOCKET_EVENTS.TRANSPORTER_APPROVED, { transporterId: transporter._id, name: transporter.name });

  res.json({ success: true, message: 'Driver approved successfully', data: transporter });
});

// DELETE /transporters/:transporterId (Super Admin only) - also used to
// reject a still-pending manager submission.
const deleteTransporter = asyncHandler(async (req, res) => {
  const transporter = await Transporter.findById(req.params.transporterId);
  if (!transporter) throw ApiError.notFound('TRANSPORTER_NOT_FOUND', 'Driver not found');

  const wasPending = transporter.approvalStatus === 'PENDING_APPROVAL';

  await transporter.deleteOne();

  await auditService.log({
    entityType: 'TRANSPORTER',
    entityId: transporter._id,
    action: AUDIT_ACTIONS.DELETE,
    user: req.user,
    description: `Driver/Transporter ${transporter.name} deleted`
  });

  if (wasPending) {
    emitToAdmins(SOCKET_EVENTS.TRANSPORTER_REJECTED, { transporterId: transporter._id, name: transporter.name });
  }

  res.json({ success: true, message: 'Driver deleted successfully' });
});

module.exports = { listTransporters, createTransporter, updateTransporter, approveTransporter, deleteTransporter };
