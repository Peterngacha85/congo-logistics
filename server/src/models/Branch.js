const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    branchName: { type: String, required: true, trim: true },
    branchCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    location: { type: String, trim: true },

    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    coManagerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    isActive: { type: Boolean, default: true },
    operationalCosts: {
      estimatedMonthly: { type: Number, default: 0 }
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

branchSchema.index({ managerId: 1 });
branchSchema.index({ isActive: 1 });

module.exports = mongoose.model('Branch', branchSchema);
