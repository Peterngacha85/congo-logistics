const Truck = require('../models/Truck');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { ROLES, AUDIT_ACTIONS, SOCKET_EVENTS } = require('../config/constants');
const { emitToAdmins } = require('../config/socket');

// GET /trucks
// Branch managers see: APPROVED trucks usable by their branch (branchId
// matches theirs or is unset/company-wide) + their own PENDING_APPROVAL
// submissions, so they can track status. Super Admin sees everything and can
// filter with ?approvalStatus=.
const listTrucks = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query = {
      $or: [
        { approvalStatus: 'APPROVED', $or: [{ branchId: req.user.branchId }, { branchId: null }] },
        { createdBy: req.user.userId }
      ]
    };
  } else if (req.query.approvalStatus) {
    query.approvalStatus = req.query.approvalStatus;
  }

  const trucks = await Truck.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: trucks });
});

// POST /trucks - any authenticated user. Admin submissions are auto-approved;
// manager submissions start PENDING_APPROVAL and default to their own branch.
const createTruck = asyncHandler(async (req, res) => {
  const { truckNumber, trailerNumber, make, model, year, licensePlate, vin, ownerName, ownerPhone, branchId } =
    req.body;

  if (!truckNumber) {
    throw ApiError.badRequest('MISSING_FIELDS', 'truckNumber is required');
  }

  const existing = await Truck.findOne({ truckNumber });
  if (existing) {
    throw ApiError.conflict('TRUCK_EXISTS', 'A truck with this number already exists');
  }

  const isAdmin = req.user.role === ROLES.SUPER_ADMIN;
  let resolvedBranchId = isAdmin ? branchId || null : req.user.branchId;

  if (resolvedBranchId) {
    const branch = await Branch.findById(resolvedBranchId);
    if (!branch) throw ApiError.badRequest('INVALID_BRANCH', 'Branch does not exist');
  }

  const truck = await Truck.create({
    truckNumber,
    trailerNumber,
    make,
    model,
    year,
    licensePlate,
    vin,
    ownerName,
    ownerPhone,
    branchId: resolvedBranchId,
    approvalStatus: isAdmin ? 'APPROVED' : 'PENDING_APPROVAL',
    createdBy: req.user.userId
  });

  await auditService.log({
    entityType: 'TRUCK',
    entityId: truck._id,
    action: AUDIT_ACTIONS.CREATE,
    user: req.user,
    branchId: truck.branchId,
    description: `Truck ${truck.truckNumber} added${isAdmin ? '' : ' (pending approval)'}`
  });

  if (!isAdmin) {
    emitToAdmins(SOCKET_EVENTS.TRUCK_REGISTERED, { truckId: truck._id, truckNumber: truck.truckNumber });
  }

  res.status(201).json({ success: true, message: 'Truck added successfully', data: truck });
});

// PUT /trucks/:truckId (Super Admin only)
const updateTruck = asyncHandler(async (req, res) => {
  const truck = await Truck.findById(req.params.truckId);
  if (!truck) throw ApiError.notFound('TRUCK_NOT_FOUND', 'Truck not found');

  const editableFields = [
    'truckNumber',
    'trailerNumber',
    'make',
    'model',
    'year',
    'licensePlate',
    'vin',
    'ownerName',
    'ownerPhone',
    'branchId',
    'status'
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) truck[field] = req.body[field];
  });

  await truck.save();

  await auditService.log({
    entityType: 'TRUCK',
    entityId: truck._id,
    action: AUDIT_ACTIONS.UPDATE,
    user: req.user,
    branchId: truck.branchId,
    description: `Truck ${truck.truckNumber} updated`
  });

  res.json({ success: true, message: 'Truck updated successfully', data: truck });
});

// PUT /trucks/:truckId/approve (Super Admin only)
const approveTruck = asyncHandler(async (req, res) => {
  const truck = await Truck.findById(req.params.truckId);
  if (!truck) throw ApiError.notFound('TRUCK_NOT_FOUND', 'Truck not found');

  if (truck.approvalStatus !== 'PENDING_APPROVAL') {
    throw ApiError.badRequest('NOT_PENDING', 'Only trucks awaiting approval can be approved');
  }

  truck.approvalStatus = 'APPROVED';
  await truck.save();

  await auditService.log({
    entityType: 'TRUCK',
    entityId: truck._id,
    action: AUDIT_ACTIONS.APPROVE,
    user: req.user,
    branchId: truck.branchId,
    description: `Truck ${truck.truckNumber} approved`
  });

  emitToAdmins(SOCKET_EVENTS.TRUCK_APPROVED, { truckId: truck._id, truckNumber: truck.truckNumber });

  res.json({ success: true, message: 'Truck approved successfully', data: truck });
});

// DELETE /trucks/:truckId (Super Admin only) - also used to reject a
// still-pending manager submission.
const deleteTruck = asyncHandler(async (req, res) => {
  const truck = await Truck.findById(req.params.truckId);
  if (!truck) throw ApiError.notFound('TRUCK_NOT_FOUND', 'Truck not found');

  const wasPending = truck.approvalStatus === 'PENDING_APPROVAL';

  await truck.deleteOne();

  await auditService.log({
    entityType: 'TRUCK',
    entityId: truck._id,
    action: AUDIT_ACTIONS.DELETE,
    user: req.user,
    branchId: truck.branchId,
    description: `Truck ${truck.truckNumber} deleted`
  });

  if (wasPending) {
    emitToAdmins(SOCKET_EVENTS.TRUCK_REJECTED, { truckId: truck._id, truckNumber: truck.truckNumber });
  }

  res.json({ success: true, message: 'Truck deleted successfully' });
});

module.exports = { listTrucks, createTruck, updateTruck, approveTruck, deleteTruck };
