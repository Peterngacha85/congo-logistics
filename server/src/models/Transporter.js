const mongoose = require('mongoose');

const transporterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

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

    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }]
  },
  { timestamps: true }
);

transporterSchema.index({ name: 1 });
transporterSchema.index({ phone: 1 }, { sparse: true });
transporterSchema.index({ status: 1 });

module.exports = mongoose.model('Transporter', transporterSchema);
