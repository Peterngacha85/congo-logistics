const mongoose = require('mongoose');

const transporterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    licenseNumber: { type: String, trim: true },

    city: String,
    region: String,

    bankName: String,
    bankAccount: String,
    mobileMoneyNumber: String,

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE'
    },

    totalTrips: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },

    // Empty branchIds = available company-wide. A manager's own submission
    // defaults to just their branch; admin can leave it empty or pick any.
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],

    // Gatekeeping for manager-submitted transporters, mirroring Truck: not
    // selectable on a trip until an admin approves it.
    approvalStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED'],
      default: 'APPROVED'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

transporterSchema.index({ name: 1 });
transporterSchema.index({ phone: 1 }, { sparse: true });
transporterSchema.index({ status: 1 });
transporterSchema.index({ approvalStatus: 1 });

module.exports = mongoose.model('Transporter', transporterSchema);
