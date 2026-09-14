const AuditLog = require('../models/AuditLog');
const Trip = require('../models/Trip');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../config/constants');

// GET /auditlogs/trip/:tripId
const getTripAuditTrail = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) throw ApiError.notFound('TRIP_NOT_FOUND', 'Trip not found');

  if (req.user.role === ROLES.BRANCH_MANAGER && trip.branchId.toString() !== req.user.branchId) {
    throw ApiError.forbidden('CROSS_BRANCH_ACCESS', "You don't have access to this data");
  }

  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const logs = await AuditLog.find({ entityId: trip._id, entityType: 'TRIP' })
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .populate('userId', 'firstName lastName email role');

  res.json({
    success: true,
    data: logs.map((log) => ({
      _id: log._id,
      action: log.action,
      description: log.description,
      user: log.userId
        ? { name: `${log.userId.firstName} ${log.userId.lastName}`, email: log.userId.email, role: log.userId.role }
        : { name: log.userName, role: log.userRole },
      timestamp: log.timestamp,
      changes: log.changes
    }))
  });
});

// GET /auditlogs (Super Admin only)
const listAuditLogs = asyncHandler(async (req, res) => {
  const { entityType, action, branchId, userId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
  const query = {};

  if (entityType) query.entityType = entityType;
  if (action) query.action = action;
  if (branchId) query.branchId = branchId;
  if (userId) query.userId = userId;
  if (dateFrom || dateTo) {
    query.timestamp = {};
    if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
    if (dateTo) query.timestamp.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalRecords: total,
      limit: limitNum
    }
  });
});

module.exports = { getTripAuditTrail, listAuditLogs };
