const AuditLog = require('../models/AuditLog');

async function log({ entityType, entityId, action, user, branchId, description, changes = {}, ipAddress }) {
  return AuditLog.create({
    entityType,
    entityId,
    action,
    userId: user.userId || user._id,
    userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.userName,
    userRole: user.role,
    branchId,
    description,
    changes,
    ipAddress
  });
}

module.exports = { log };
