const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },

    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    amountPaid: { type: Number, required: true },
    transactionRef: String,

    transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter' },
    transporterName: String,

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    reconciled: { type: Boolean, default: false },
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reconciledAt: Date,

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now },
    notes: String
  },
  { timestamps: true }
);

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ tripId: 1 });
paymentSchema.index({ branchId: 1, paymentDate: -1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ reconciled: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
