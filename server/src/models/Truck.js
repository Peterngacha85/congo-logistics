const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema(
  {
    truckNumber: { type: String, required: true, unique: true, trim: true },
    trailerNumber: { type: String, trim: true },
    registrationExpiry: Date,

    make: String,
    model: String,
    year: Number,
    licensePlate: { type: String, trim: true },
    vin: String,

    ownerName: String,
    ownerPhone: String,

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'],
      default: 'ACTIVE'
    },
    totalTripsCompleted: { type: Number, default: 0 },

    gpsDeviceId: String,
    hasGPS: { type: Boolean, default: false },

    // Gatekeeping for manager-submitted trucks, separate from the operational
    // `status` above: a truck a manager adds isn't selectable on a trip until
    // an admin approves it. Admin-created trucks are approved immediately.
    approvalStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED'],
      default: 'APPROVED'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

truckSchema.index({ branchId: 1 });
truckSchema.index({ status: 1 });
truckSchema.index({ approvalStatus: 1 });
truckSchema.index({ licensePlate: 1 });

module.exports = mongoose.model('Truck', truckSchema);
