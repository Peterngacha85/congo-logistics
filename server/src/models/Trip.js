const mongoose = require('mongoose');
const { TRIP_STATUS, PAYMENT_METHODS } = require('../config/constants');

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(TRIP_STATUS), required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { _id: false }
);

const paymentDetailsSchema = new mongoose.Schema(
  {
    paymentDate: Date,
    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHODS) },
    amountPaid: Number,
    confirmationRef: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: Date
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    tripNumber: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, unique: true, sparse: true },

    truckNumber: { type: String, required: true, trim: true },
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
    trailerNumber: { type: String, trim: true },
    transporterName: { type: String, required: true, trim: true },
    transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter' },

    loadingPoint: { type: String, required: true, trim: true, maxlength: 100 },
    offloadingPoint: { type: String, required: true, trim: true, maxlength: 100 },
    dateLoaded: { type: Date, required: true },
    dateOffloaded: { type: Date, required: true },

    transportationRate: { type: Number, required: true, min: 0.01 },
    dieselPerTrip: { type: Number, required: true, min: 0 },
    mileageCash: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(TRIP_STATUS),
      default: TRIP_STATUS.PENDING
    },
    statusHistory: [statusHistoryEntrySchema],

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    invoiceGeneratedAt: Date,
    invoicePath: String,

    paymentStatus: { type: String, default: 'PENDING' },
    paymentDetails: paymentDetailsSchema,

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String,

    lastModifiedAt: Date,
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

tripSchema.index({ truckNumber: 1 });
tripSchema.index({ transporterName: 1 });
tripSchema.index({ branchId: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ dateLoaded: 1 });
tripSchema.index({ dateOffloaded: 1 });
tripSchema.index({ createdAt: 1 });
tripSchema.index({ branchId: 1, status: 1 });
tripSchema.index({ branchId: 1, dateLoaded: 1, dateOffloaded: 1 });

module.exports = mongoose.model('Trip', tripSchema);
