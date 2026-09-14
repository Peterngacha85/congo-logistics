const Invoice = require('../models/Invoice');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../config/constants');

// GET /invoices
const listInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, dateFrom, dateTo } = req.query;
  const query = {};

  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query.branchId = req.user.branchId;
  } else if (req.query.branchId) {
    query.branchId = req.query.branchId;
  }

  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.invoiceDate = {};
    if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
    if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate('tripId', 'tripNumber')
      .sort({ invoiceDate: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Invoice.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: invoices.map((inv) => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      tripNumber: inv.tripId?.tripNumber,
      transporterName: inv.transporterName,
      totalAmount: inv.totalAmount,
      status: inv.status,
      invoiceDate: inv.invoiceDate,
      paidAt: inv.paymentReceivedAt
    })),
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalRecords: total,
      limit: limitNum
    }
  });
});

// GET /invoices/:invoiceId
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.invoiceId).populate('tripId', 'tripNumber loadingPoint offloadingPoint branchId');
  if (!invoice) throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice not found');

  if (
    req.user.role === ROLES.BRANCH_MANAGER &&
    invoice.branchId.toString() !== req.user.branchId
  ) {
    throw ApiError.forbidden('CROSS_BRANCH_ACCESS', "You don't have access to this data");
  }

  res.json({
    success: true,
    data: {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      tripNumber: invoice.tripId?.tripNumber,
      tripId: invoice.tripId?._id,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      transporterName: invoice.transporterName,
      loadingPoint: invoice.tripId?.loadingPoint,
      offloadingPoint: invoice.tripId?.offloadingPoint,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      serviceFee: invoice.serviceFee,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      paymentReceivedAt: invoice.paymentReceivedAt
    }
  });
});

module.exports = { listInvoices, getInvoice };
