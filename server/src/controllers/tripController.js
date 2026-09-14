const Trip = require('../models/Trip');
const Branch = require('../models/Branch');
const Truck = require('../models/Truck');
const Transporter = require('../models/Transporter');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');
const { generateTripNumber, generateInvoiceNumber } = require('../utils/idGenerator');
const { calculateTotals } = require('../utils/calculations');
const { generateInvoicePdf } = require('../services/invoiceService');
const {
  ROLES,
  TRIP_STATUS,
  ALLOWED_STATUS_TRANSITIONS,
  AUDIT_ACTIONS,
  PAYMENT_METHODS,
  SOCKET_EVENTS
} = require('../config/constants');
const { emitToAdminsAndBranch } = require('../config/socket');

function scopeToBranch(req, query = {}) {
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    query.branchId = req.user.branchId;
  } else if (req.query.branchId) {
    query.branchId = req.query.branchId;
  }
  return query;
}

async function assertTripAccessible(req, trip) {
  if (!trip) throw ApiError.notFound('TRIP_NOT_FOUND', 'Trip not found');
  if (req.user.role === ROLES.BRANCH_MANAGER && trip.branchId.toString() !== req.user.branchId) {
    throw ApiError.forbidden('CROSS_BRANCH_ACCESS', "You don't have access to this data");
  }
}

// GET /trips
const listTrips = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    status,
    search,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = scopeToBranch(req);

  if (status) {
    const statuses = Array.isArray(status) ? status : status.split(',');
    query.status = { $in: statuses };
  }

  if (search) {
    query.$or = [
      { truckNumber: { $regex: search, $options: 'i' } },
      { transporterName: { $regex: search, $options: 'i' } }
    ];
  }

  if (dateFrom || dateTo) {
    query.dateLoaded = {};
    if (dateFrom) query.dateLoaded.$gte = new Date(dateFrom);
    if (dateTo) query.dateLoaded.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [trips, total] = await Promise.all([
    Trip.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum),
    Trip.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: trips,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalRecords: total,
      limit: limitNum,
      hasNextPage: skip + trips.length < total,
      hasPrevPage: pageNum > 1
    }
  });
});

// GET /trips/:tripId
const getTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId).populate('createdBy', 'firstName lastName email');
  await assertTripAccessible(req, trip);

  const auditTrail = await AuditLog.find({ entityId: trip._id, entityType: 'TRIP' })
    .sort({ timestamp: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      ...trip.toObject(),
      auditTrail
    }
  });
});

// POST /trips
const createTrip = asyncHandler(async (req, res) => {
  const {
    truckId,
    transporterId,
    trailerNumber,
    loadingPoint,
    offloadingPoint,
    dateLoaded,
    dateOffloaded,
    transportationRate,
    dieselPerTrip,
    mileageCash,
    notes
  } = req.body;

  const branchId = req.user.role === ROLES.BRANCH_MANAGER ? req.user.branchId : req.body.branchId;

  if (
    !truckId ||
    !transporterId ||
    !loadingPoint ||
    !offloadingPoint ||
    !dateLoaded ||
    !dateOffloaded ||
    transportationRate === undefined ||
    dieselPerTrip === undefined ||
    mileageCash === undefined ||
    !branchId
  ) {
    throw ApiError.badRequest('MISSING_FIELDS', 'Missing required fields');
  }

  if (transportationRate <= 0) {
    throw ApiError.badRequest('INVALID_RATE', 'Transportation rate must be greater than 0');
  }
  if (dieselPerTrip < 0 || mileageCash < 0) {
    throw ApiError.badRequest('INVALID_AMOUNT', 'Diesel and mileage cannot be negative');
  }
  if (new Date(dateLoaded) > new Date()) {
    throw ApiError.badRequest('INVALID_DATE', 'Date loaded cannot be in the future');
  }
  if (new Date(dateOffloaded) < new Date(dateLoaded)) {
    throw ApiError.badRequest('INVALID_DATE', 'Date offloaded cannot be before date loaded');
  }

  const branch = await Branch.findById(branchId);
  if (!branch) throw ApiError.badRequest('INVALID_BRANCH', 'Branch does not exist');

  const truck = await Truck.findById(truckId);
  if (!truck) throw ApiError.badRequest('INVALID_TRUCK', 'Truck does not exist');
  if (truck.approvalStatus !== 'APPROVED') {
    throw ApiError.badRequest('TRUCK_NOT_APPROVED', 'This truck is still awaiting admin approval');
  }
  if (truck.branchId && truck.branchId.toString() !== branchId.toString()) {
    throw ApiError.badRequest('TRUCK_WRONG_BRANCH', 'This truck is not available for your branch');
  }

  const transporter = await Transporter.findById(transporterId);
  if (!transporter) throw ApiError.badRequest('INVALID_TRANSPORTER', 'Driver/transporter does not exist');
  if (transporter.approvalStatus !== 'APPROVED') {
    throw ApiError.badRequest('TRANSPORTER_NOT_APPROVED', 'This driver is still awaiting admin approval');
  }
  if (
    transporter.branchIds.length > 0 &&
    !transporter.branchIds.some((id) => id.toString() === branchId.toString())
  ) {
    throw ApiError.badRequest('TRANSPORTER_WRONG_BRANCH', 'This driver is not available for your branch');
  }

  const truckNumber = truck.truckNumber;
  const transporterName = transporter.name;

  const startOfDay = new Date(new Date(dateLoaded).setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date(dateLoaded).setHours(23, 59, 59, 999));
  const duplicate = await Trip.findOne({
    branchId,
    truckNumber,
    dateLoaded: { $gte: startOfDay, $lte: endOfDay }
  });
  if (duplicate) {
    throw ApiError.badRequest('DUPLICATE_TRIP', 'Truck number already logged today for this branch');
  }

  const tripNumber = await generateTripNumber(branch);
  const totals = calculateTotals({ transportationRate, dieselPerTrip, mileageCash });

  const trip = await Trip.create({
    tripNumber,
    truckNumber,
    truckId: truck._id,
    trailerNumber: trailerNumber || truck.trailerNumber,
    loadingPoint,
    offloadingPoint,
    dateLoaded,
    dateOffloaded,
    transporterName,
    transporterId: transporter._id,
    transportationRate,
    dieselPerTrip,
    mileageCash,
    serviceFee: totals.serviceFee,
    totalAmount: totals.totalAmount,
    status: TRIP_STATUS.PENDING,
    statusHistory: [{ status: TRIP_STATUS.PENDING, changedAt: new Date(), changedBy: req.user.userId }],
    branchId,
    createdBy: req.user.userId,
    notes
  });

  await auditService.log({
    entityType: 'TRIP',
    entityId: trip._id,
    action: AUDIT_ACTIONS.CREATE,
    user: req.user,
    branchId: trip.branchId,
    description: `Trip ${trip.tripNumber} created`,
    changes: { tripNumber: trip.tripNumber, status: trip.status, truckNumber: trip.truckNumber }
  });

  emitToAdminsAndBranch(trip.branchId, SOCKET_EVENTS.TRIP_CREATED, {
    tripId: trip._id,
    tripNumber: trip.tripNumber,
    branchId: trip.branchId
  });

  res.status(201).json({
    success: true,
    message: 'Trip created successfully',
    data: trip
  });
});

// PUT /trips/:tripId
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  await assertTripAccessible(req, trip);

  if (![TRIP_STATUS.PENDING, TRIP_STATUS.ASSIGNED].includes(trip.status)) {
    throw ApiError.badRequest('TRIP_LOCKED', `Cannot edit trip with status ${trip.status}`);
  }

  const editableFields = [
    'trailerNumber',
    'loadingPoint',
    'offloadingPoint',
    'dateLoaded',
    'dateOffloaded',
    'transportationRate',
    'dieselPerTrip',
    'mileageCash',
    'notes'
  ];

  const changes = {};
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined && String(req.body[field]) !== String(trip[field])) {
      changes[field] = { oldValue: trip[field], newValue: req.body[field] };
      trip[field] = req.body[field];
    }
  });

  if (req.body.truckId && req.body.truckId !== String(trip.truckId)) {
    const truck = await Truck.findById(req.body.truckId);
    if (!truck) throw ApiError.badRequest('INVALID_TRUCK', 'Truck does not exist');
    if (truck.approvalStatus !== 'APPROVED') {
      throw ApiError.badRequest('TRUCK_NOT_APPROVED', 'This truck is still awaiting admin approval');
    }
    changes.truckNumber = { oldValue: trip.truckNumber, newValue: truck.truckNumber };
    trip.truckId = truck._id;
    trip.truckNumber = truck.truckNumber;
  }

  if (req.body.transporterId && req.body.transporterId !== String(trip.transporterId)) {
    const transporter = await Transporter.findById(req.body.transporterId);
    if (!transporter) throw ApiError.badRequest('INVALID_TRANSPORTER', 'Driver/transporter does not exist');
    if (transporter.approvalStatus !== 'APPROVED') {
      throw ApiError.badRequest('TRANSPORTER_NOT_APPROVED', 'This driver is still awaiting admin approval');
    }
    changes.transporterName = { oldValue: trip.transporterName, newValue: transporter.name };
    trip.transporterId = transporter._id;
    trip.transporterName = transporter.name;
  }

  if (trip.dateOffloaded && trip.dateLoaded && new Date(trip.dateOffloaded) < new Date(trip.dateLoaded)) {
    throw ApiError.badRequest('INVALID_DATE', 'Date offloaded cannot be before date loaded');
  }

  const totals = calculateTotals({
    transportationRate: trip.transportationRate,
    dieselPerTrip: trip.dieselPerTrip,
    mileageCash: trip.mileageCash
  });
  trip.serviceFee = totals.serviceFee;
  trip.totalAmount = totals.totalAmount;
  trip.lastModifiedAt = new Date();
  trip.lastModifiedBy = req.user.userId;

  await trip.save();

  if (Object.keys(changes).length > 0) {
    await auditService.log({
      entityType: 'TRIP',
      entityId: trip._id,
      action: AUDIT_ACTIONS.UPDATE,
      user: req.user,
      branchId: trip.branchId,
      description: `Trip ${trip.tripNumber} updated`,
      changes
    });

    emitToAdminsAndBranch(trip.branchId, SOCKET_EVENTS.TRIP_UPDATED, {
      tripId: trip._id,
      tripNumber: trip.tripNumber,
      branchId: trip.branchId
    });
  }

  res.json({
    success: true,
    message: 'Trip updated successfully',
    data: trip
  });
});

// DELETE /trips/:tripId - Branch managers may only delete PENDING trips.
// Super Admin can delete a trip in any status (override, logged as such).
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  await assertTripAccessible(req, trip);

  const isAdminOverride = req.user.role === ROLES.SUPER_ADMIN && trip.status !== TRIP_STATUS.PENDING;

  if (req.user.role === ROLES.BRANCH_MANAGER && trip.status !== TRIP_STATUS.PENDING) {
    throw ApiError.badRequest('TRIP_NOT_DELETABLE', 'Only pending trips can be deleted');
  }

  const previousStatus = trip.status;
  await trip.deleteOne();

  await auditService.log({
    entityType: 'TRIP',
    entityId: trip._id,
    action: AUDIT_ACTIONS.DELETE,
    user: req.user,
    branchId: trip.branchId,
    description: isAdminOverride
      ? `Trip ${trip.tripNumber} deleted by Super Admin override (was ${previousStatus})`
      : `Trip ${trip.tripNumber} deleted`,
    changes: { deletedAt: new Date(), previousStatus }
  });

  emitToAdminsAndBranch(trip.branchId, SOCKET_EVENTS.TRIP_DELETED, {
    tripId: trip._id,
    tripNumber: trip.tripNumber,
    branchId: trip.branchId
  });

  res.json({ success: true, message: 'Trip deleted successfully' });
});

// PUT /trips/:tripId/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const trip = await Trip.findById(req.params.tripId);
  await assertTripAccessible(req, trip);

  if (!status || !Object.values(TRIP_STATUS).includes(status)) {
    throw ApiError.badRequest('INVALID_STATUS', 'Invalid status value');
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[trip.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${trip.status} to ${status}`
    );
  }

  const oldStatus = trip.status;
  trip.status = status;
  if (status === TRIP_STATUS.COMPLETED) {
    trip.dateOffloaded = trip.dateOffloaded || new Date();
  }
  trip.statusHistory.push({ status, changedAt: new Date(), changedBy: req.user.userId });
  trip.lastModifiedAt = new Date();
  trip.lastModifiedBy = req.user.userId;
  await trip.save();

  await auditService.log({
    entityType: 'TRIP',
    entityId: trip._id,
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    user: req.user,
    branchId: trip.branchId,
    description: `Trip ${trip.tripNumber} status changed from ${oldStatus} to ${status}${notes ? ` (${notes})` : ''}`,
    changes: { status: { oldValue: oldStatus, newValue: status } }
  });

  emitToAdminsAndBranch(trip.branchId, SOCKET_EVENTS.TRIP_STATUS_CHANGED, {
    tripId: trip._id,
    tripNumber: trip.tripNumber,
    branchId: trip.branchId,
    status
  });

  res.json({
    success: true,
    message: `Trip status updated to ${status}`,
    data: { status: trip.status, statusHistory: trip.statusHistory }
  });
});

// PUT /trips/:tripId/approve
const approveTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  await assertTripAccessible(req, trip);

  if (trip.status !== TRIP_STATUS.COMPLETED) {
    throw ApiError.badRequest('INVALID_STATUS_TRANSITION', 'Trip must be in COMPLETED status');
  }
  if (trip.transportationRate <= 0 || trip.totalAmount <= 0) {
    throw ApiError.badRequest('INVALID_TRIP_DATA', 'Invalid financial data on trip');
  }

  const branch = await Branch.findById(trip.branchId);
  const invoiceNumber = trip.invoiceNumber || (await generateInvoiceNumber(branch));

  const invoice = await Invoice.create({
    invoiceNumber,
    tripId: trip._id,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    transporterName: trip.transporterName,
    transporterId: trip.transporterId,
    lineItems: [
      { description: 'Transportation Rate', amount: trip.transportationRate },
      { description: 'Diesel Per Trip', amount: trip.dieselPerTrip },
      { description: 'Mileage Cash', amount: trip.mileageCash }
    ],
    subtotal: trip.transportationRate + trip.dieselPerTrip + trip.mileageCash,
    serviceFee: trip.serviceFee,
    totalAmount: trip.totalAmount,
    status: 'ISSUED',
    branchId: trip.branchId,
    createdBy: req.user.userId
  });

  let pdfPath;
  try {
    pdfPath = await generateInvoicePdf({
      invoice,
      trip,
      approverName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
    });
  } catch (error) {
    await invoice.deleteOne();
    throw ApiError.internal('Failed to generate invoice PDF. Please try again.');
  }

  invoice.pdfPath = pdfPath;
  invoice.pdfGeneratedAt = new Date();
  invoice.pdfGeneratedBy = req.user.userId;
  await invoice.save();

  const oldStatus = trip.status;
  trip.status = TRIP_STATUS.INVOICED;
  trip.approvedBy = req.user.userId;
  trip.approvedAt = new Date();
  trip.invoiceNumber = invoiceNumber;
  trip.invoiceGeneratedAt = new Date();
  trip.invoicePath = pdfPath;
  trip.statusHistory.push({ status: TRIP_STATUS.INVOICED, changedAt: new Date(), changedBy: req.user.userId });
  await trip.save();

  await auditService.log({
    entityType: 'TRIP',
    entityId: trip._id,
    action: AUDIT_ACTIONS.APPROVE,
    user: req.user,
    branchId: trip.branchId,
    description: `Trip ${trip.tripNumber} approved and invoiced`,
    changes: {
      status: { oldValue: oldStatus, newValue: TRIP_STATUS.INVOICED },
      invoiceNumber,
      invoiceGeneratedAt: trip.invoiceGeneratedAt
    }
  });

  emitToAdminsAndBranch(trip.branchId, SOCKET_EVENTS.TRIP_INVOICED, {
    tripId: trip._id,
    tripNumber: trip.tripNumber,
    branchId: trip.branchId,
    invoiceNumber
  });

  res.json({
    success: true,
    message: 'Trip approved and invoice generated',
    data: {
      tripId: trip._id,
      status: trip.status,
      invoiceNumber,
      invoicePath: pdfPath,
      invoiceGeneratedAt: trip.invoiceGeneratedAt,
      totalAmount: trip.totalAmount,
      approvedBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
    }
  });
});

// GET /trips/:tripId/invoice/download
const downloadInvoice = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  await assertTripAccessible(req, trip);

  if (!trip.invoicePath) {
    throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice not found');
  }

  const path = require('path');
  const fs = require('fs');
  const absolutePath = path.join(__dirname, '..', '..', 'invoices', path.basename(trip.invoicePath));

  if (!fs.existsSync(absolutePath)) {
    throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice file not found');
  }

  res.download(absolutePath);
});

// PUT /trips/:tripId/mark-paid
const markAsPaid = asyncHandler(async (req, res) => {
  const { paymentDate, paymentMethod, confirmationRef, amountPaid } = req.body;
  const trip = await Trip.findById(req.params.tripId);
  await assertTripAccessible(req, trip);

  if (trip.status !== TRIP_STATUS.INVOICED) {
    throw ApiError.badRequest('INVALID_STATUS_TRANSITION', 'Trip must be in INVOICED status');
  }
  if (!paymentDate) {
    throw ApiError.badRequest('MISSING_PAYMENT_DATE', 'Payment date is required');
  }
  if (new Date(paymentDate) > new Date()) {
    throw ApiError.badRequest('INVALID_DATE', 'Payment date cannot be in the future');
  }
  if (!paymentMethod || !Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    throw ApiError.badRequest('MISSING_PAYMENT_METHOD', 'A valid payment method is required');
  }

  const finalAmount = amountPaid || trip.totalAmount;

  trip.paymentStatus = 'PAID';
  trip.paymentDetails = {
    paymentDate,
    paymentMethod,
    amountPaid: finalAmount,
    confirmationRef,
    recordedBy: req.user.userId,
    recordedAt: new Date()
  };
  trip.status = TRIP_STATUS.PAID;
  trip.statusHistory.push({ status: TRIP_STATUS.PAID, changedAt: new Date(), changedBy: req.user.userId });
  await trip.save();

  await Payment.create({
    paymentId: `PAY-${Date.now()}`,
    invoiceId: (await Invoice.findOne({ invoiceNumber: trip.invoiceNumber }))?._id,
    tripId: trip._id,
    paymentDate,
    paymentMethod,
    amountPaid: finalAmount,
    transactionRef: confirmationRef,
    transporterName: trip.transporterName,
    transporterId: trip.transporterId,
    branchId: trip.branchId,
    recordedBy: req.user.userId
  });

  await Invoice.findOneAndUpdate(
    { invoiceNumber: trip.invoiceNumber },
    { status: 'PAID', paymentReceivedAt: paymentDate }
  );

  await auditService.log({
    entityType: 'TRIP',
    entityId: trip._id,
    action: AUDIT_ACTIONS.MARK_PAID,
    user: req.user,
    branchId: trip.branchId,
    description: `Trip ${trip.tripNumber} marked as paid`,
    changes: {
      status: { oldValue: TRIP_STATUS.INVOICED, newValue: TRIP_STATUS.PAID },
      paymentMethod,
      confirmationRef
    }
  });

  emitToAdminsAndBranch(trip.branchId, SOCKET_EVENTS.TRIP_PAID, {
    tripId: trip._id,
    tripNumber: trip.tripNumber,
    branchId: trip.branchId
  });

  res.json({
    success: true,
    message: 'Trip marked as paid',
    data: {
      tripId: trip._id,
      status: trip.status,
      paymentDetails: trip.paymentDetails
    }
  });
});

module.exports = {
  listTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  updateStatus,
  approveTrip,
  downloadInvoice,
  markAsPaid
};
