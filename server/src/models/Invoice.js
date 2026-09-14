const mongoose = require('mongoose');
const { INVOICE_STATUS } = require('../config/constants');

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },

    invoiceDate: { type: Date, default: Date.now },
    dueDate: Date,

    transporterName: { type: String, required: true },
    transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter' },

    lineItems: [lineItemSchema],

    subtotal: { type: Number, required: true },
    serviceFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.ISSUED
    },
    paymentReceivedAt: Date,

    pdfPath: String,
    pdfGeneratedAt: Date,
    pdfGeneratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

invoiceSchema.index({ tripId: 1 });
invoiceSchema.index({ branchId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
