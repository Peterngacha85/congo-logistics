const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../config/constants');

const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },

    timestamp: { type: Date, default: Date.now },
    ipAddress: String,

    changes: { type: mongoose.Schema.Types.Mixed, default: {} },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    description: { type: String, required: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    capped: false
  }
);

auditLogSchema.index({ entityId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ branchId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, action: 1 });
auditLogSchema.index({ timestamp: 1 });

// Immutability: audit logs are insert-only. Block update/delete at the model level.
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
  next(new Error('AuditLog records are immutable and cannot be updated'));
});
auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('AuditLog records are immutable and cannot be deleted'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
