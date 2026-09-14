# Trip Workflow & State Machine

---

## **Trip Status State Machine**

```
┌─────────┐
│ PENDING │  ← Trip created, waiting for assignment
└────┬────┘
     │ manager assigns truck
     ↓
┌──────────┐
│ ASSIGNED │  ← Truck is assigned, ready for transport
└────┬─────┘
     │ truck is loaded and departs
     ↓
┌────────────┐
│ IN_TRANSIT │  ← Shipment is on the way
└────┬───────┘
     │ shipment arrives and unloads
     ↓
┌──────────┐
│ COMPLETED│  ← Delivery confirmed, ready for invoicing
└────┬─────┘
     │ manager approves → system generates invoice
     ↓
┌───────────┐
│ INVOICED  │  ← Invoice generated, waiting for payment
└────┬──────┘
     │ payment received
     ↓
┌──────┐
│ PAID │  ← Payment confirmed, trip closed
└──────┘

Note: Cannot go backward in status (no reverting from INVOICED to COMPLETED, etc.)
Exception: INVOICED → COMPLETED only if invoice generation error (rare, needs super admin)
```

---

## **Detailed Status Explanations**

### **1. PENDING**
- **When:** Trip just created
- **Who can see:** Branch manager, Super Admin
- **Possible actions:**
  - Edit trip details (rates, points, dates, transporter)
  - Delete trip
  - Move to ASSIGNED
  - View audit trail
- **Cannot do:**
  - Approve for invoicing
  - Mark as paid
  - Generate invoice

**Transition Rule:**
```javascript
// Manager clicks "Assign Truck"
trip.status = "ASSIGNED"
trip.statusHistory.push({
  status: "ASSIGNED",
  changedAt: new Date(),
  changedBy: userId
})
```

---

### **2. ASSIGNED**
- **When:** Truck is assigned, loading date is set
- **Possible actions:**
  - Edit trip details
  - Move to IN_TRANSIT
  - Move back to PENDING (only if not yet loaded)
- **Cannot do:**
  - Delete trip
  - Approve for invoicing (must be COMPLETED first)

**Transition Rule:**
```javascript
// Manager confirms truck is loaded
trip.status = "IN_TRANSIT"
trip.dateLoaded = new Date()
```

---

### **3. IN_TRANSIT**
- **When:** Shipment is on the road
- **Possible actions:**
  - View real-time location (future: GPS tracking)
  - Update ETA
  - Move to COMPLETED when arrived
- **Cannot do:**
  - Edit rates or route
  - Delete trip

**Transition Rule:**
```javascript
// Manager confirms delivery
trip.status = "COMPLETED"
trip.dateOffloaded = new Date()
```

---

### **4. COMPLETED**
- **When:** Shipment delivered, offloaded confirmed
- **Possible actions:**
  - Approve for invoicing (generates PDF invoice)
  - View trip details
  - View audit trail
  - Move to INVOICED
- **Cannot do:**
  - Edit trip details
  - Delete trip
  - Go back to IN_TRANSIT

**Transition Rule:**
```javascript
// Manager clicks "Approve & Generate Invoice"
trip.status = "INVOICED"
trip.approvedBy = userId
trip.approvedAt = new Date()

// Trigger invoice generation
generateInvoice(trip)
```

---

### **5. INVOICED**
- **When:** Invoice generated, sent to transporter
- **Possible actions:**
  - Download/view invoice PDF
  - Mark as PAID when payment received
  - View audit trail
  - View payment history (when added)
- **Cannot do:**
  - Edit any trip details
  - Delete trip
  - Go back to COMPLETED (except error correction by super admin)

**Transition Rule:**
```javascript
// Manager receives payment, records details
trip.status = "PAID"
trip.paymentDetails = {
  paymentDate: new Date(),
  paymentMethod: "MOBILE_MONEY",
  confirmationRef: "MTN-20240115-00123",
  amountPaid: trip.totalAmount,
  recordedBy: userId,
  recordedAt: new Date()
}

auditLog("Trip TRIP-2024-001 marked as paid", userId)
```

---

### **6. PAID**
- **When:** Payment confirmed and recorded
- **Possible actions:**
  - View full trip history
  - View audit trail
  - View payment details
  - Download invoice
- **Cannot do:**
  - Anything (final state)
  - Edit trip
  - Delete trip

---

## **Business Logic for Each Transition**

### **Validation Before ASSIGNED**
```javascript
function validateTransitionToAssigned(trip) {
  const errors = []
  
  if (trip.status !== "PENDING") {
    errors.push("Can only assign from PENDING status")
  }
  
  if (!trip.truckNumber) {
    errors.push("Truck number required")
  }
  
  if (new Date(trip.dateLoaded) > new Date()) {
    errors.push("Load date cannot be in future")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### **Validation Before IN_TRANSIT**
```javascript
function validateTransitionToInTransit(trip) {
  const errors = []
  
  if (trip.status !== "ASSIGNED") {
    errors.push("Trip must be assigned first")
  }
  
  if (!trip.dateLoaded) {
    errors.push("Load date not set")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### **Validation Before COMPLETED**
```javascript
function validateTransitionToCompleted(trip) {
  const errors = []
  
  if (trip.status !== "IN_TRANSIT") {
    errors.push("Trip must be in transit")
  }
  
  if (!trip.dateOffloaded) {
    errors.push("Offload date required")
  }
  
  if (new Date(trip.dateOffloaded) < new Date(trip.dateLoaded)) {
    errors.push("Offload date must be after load date")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### **Validation Before INVOICED (Approval)**
```javascript
function validateApproval(trip) {
  const errors = []
  
  if (trip.status !== "COMPLETED") {
    errors.push("Only completed trips can be approved")
  }
  
  // Verify all financial data
  if (trip.transportationRate <= 0) {
    errors.push("Invalid transportation rate")
  }
  
  if (trip.totalAmount <= 0) {
    errors.push("Invalid total amount")
  }
  
  // Verify dates are not in future
  if (new Date(trip.dateLoaded) > new Date() || 
      new Date(trip.dateOffloaded) > new Date()) {
    errors.push("Trip dates cannot be in future")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### **Validation Before PAID**
```javascript
function validateMarkAsPaid(trip, paymentData) {
  const errors = []
  
  if (trip.status !== "INVOICED") {
    errors.push("Only invoiced trips can be marked as paid")
  }
  
  if (!paymentData.paymentDate) {
    errors.push("Payment date required")
  }
  
  if (new Date(paymentData.paymentDate) > new Date()) {
    errors.push("Payment date cannot be in future")
  }
  
  if (!paymentData.paymentMethod) {
    errors.push("Payment method required")
  }
  
  if (paymentData.amountPaid > 0 && paymentData.amountPaid !== trip.totalAmount) {
    // Optional: allow partial payments (future enhancement)
    console.warn("Partial payment recorded")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

---

## **Financial Calculations**

### **Auto-Calculate on Create/Update**

When trip is created or rates are updated:

```javascript
function calculateTotals(trip) {
  const subtotal = 
    trip.transportationRate + 
    trip.dieselPerTrip + 
    trip.mileageCash
  
  const serviceFee = subtotal * 0.05  // 5% fixed
  const totalAmount = subtotal + serviceFee
  
  return {
    subtotal,
    serviceFee: Math.round(serviceFee),
    totalAmount: Math.round(totalAmount)
  }
}

// Update trip with calculated values
trip.serviceFee = calculateTotals(trip).serviceFee
trip.totalAmount = calculateTotals(trip).totalAmount
```

### **Example Calculation**

```
Transportation Rate:  1,000,000 CDF
Diesel Per Trip:       500,000 CDF
Mileage Cash:          200,000 CDF
─────────────────────────────────
Subtotal:            1,700,000 CDF

Service Fee (5%):       85,000 CDF
─────────────────────────────────
TOTAL:               1,785,000 CDF  ← What transporter gets paid
```

---

## **Audit Trail Logging**

Every status change logs entry:

```javascript
async function logStatusChange(tripId, oldStatus, newStatus, userId) {
  const trip = await Trip.findById(tripId)
  
  const auditEntry = {
    entityType: "TRIP",
    entityId: tripId,
    action: "STATUS_CHANGE",
    userId: userId,
    userName: user.name,
    userRole: user.role,
    timestamp: new Date(),
    branchId: trip.branchId,
    description: `Trip ${trip.tripNumber} status changed from ${oldStatus} to ${newStatus}`,
    changes: {
      status: {
        oldValue: oldStatus,
        newValue: newStatus
      }
    }
  }
  
  await AuditLog.create(auditEntry)
}
```

---

## **Invoice Generation Logic**

When trip is approved (COMPLETED → INVOICED):

```javascript
async function generateInvoice(tripId, managerId) {
  // Validate trip is COMPLETED
  const trip = await Trip.findById(tripId)
  if (trip.status !== "COMPLETED") {
    throw new Error("Only completed trips can be invoiced")
  }
  
  // Generate invoice number if not exists
  if (!trip.invoiceNumber) {
    trip.invoiceNumber = await generateUniqueInvoiceNumber(trip.branchId)
  }
  
  // Create invoice document
  const invoice = new Invoice({
    invoiceNumber: trip.invoiceNumber,
    tripId: trip._id,
    invoiceDate: new Date(),
    dueDate: addDays(new Date(), 30),
    transporterName: trip.transporterName,
    transporterId: trip.transporterId,
    lineItems: [
      { description: "Transportation Rate", amount: trip.transportationRate },
      { description: "Diesel Per Trip", amount: trip.dieselPerTrip },
      { description: "Mileage Cash", amount: trip.mileageCash }
    ],
    subtotal: trip.transportationRate + trip.dieselPerTrip + trip.mileageCash,
    serviceFee: trip.serviceFee,
    totalAmount: trip.totalAmount,
    status: "ISSUED",
    branchId: trip.branchId,
    createdBy: managerId
  })
  
  await invoice.save()
  
  // Generate PDF
  const pdfPath = await generateInvoicePDF(invoice)
  invoice.pdfPath = pdfPath
  invoice.pdfGeneratedAt = new Date()
  await invoice.save()
  
  // Update trip
  trip.status = "INVOICED"
  trip.approvedBy = managerId
  trip.approvedAt = new Date()
  trip.invoiceNumber = invoice.invoiceNumber
  trip.invoiceGeneratedAt = new Date()
  await trip.save()
  
  // Log to audit trail
  await logStatusChange(tripId, "COMPLETED", "INVOICED", managerId)
  
  return invoice
}
```

---

## **Payment Recording Logic**

When transporter pays (INVOICED → PAID):

```javascript
async function markAsPaid(tripId, paymentData, managerId) {
  const trip = await Trip.findById(tripId)
  
  if (trip.status !== "INVOICED") {
    throw new Error("Only invoiced trips can be marked as paid")
  }
  
  // Update trip payment details
  trip.paymentStatus = "PAID"
  trip.paymentDetails = {
    paymentDate: new Date(paymentData.paymentDate),
    paymentMethod: paymentData.paymentMethod,
    amountPaid: paymentData.amountPaid || trip.totalAmount,
    confirmationRef: paymentData.confirmationRef,
    recordedBy: managerId,
    recordedAt: new Date()
  }
  
  trip.status = "PAID"
  await trip.save()
  
  // Create payment record
  const payment = new Payment({
    paymentId: `PAY-${Date.now()}`,
    invoiceId: trip.invoiceNumber, // or store invoice._id if reference exists
    tripId: trip._id,
    paymentDate: paymentData.paymentDate,
    paymentMethod: paymentData.paymentMethod,
    amountPaid: paymentData.amountPaid || trip.totalAmount,
    transactionRef: paymentData.confirmationRef,
    transporterName: trip.transporterName,
    branchId: trip.branchId,
    recordedBy: managerId,
    recordedAt: new Date()
  })
  await payment.save()
  
  // Update invoice status
  const invoice = await Invoice.findOne({ invoiceNumber: trip.invoiceNumber })
  invoice.status = "PAID"
  invoice.paymentReceivedAt = paymentData.paymentDate
  await invoice.save()
  
  // Log to audit trail
  const auditEntry = {
    entityType: "TRIP",
    entityId: tripId,
    action: "MARK_PAID",
    userId: managerId,
    timestamp: new Date(),
    description: `Trip ${trip.tripNumber} marked as paid`,
    changes: {
      status: { oldValue: "INVOICED", newValue: "PAID" },
      paymentMethod: paymentData.paymentMethod,
      confirmationRef: paymentData.confirmationRef
    }
  }
  await AuditLog.create(auditEntry)
  
  return trip
}
```

---

## **Search & Filter Logic**

### **Search Trips**
```javascript
async function searchTrips(branchId, filters) {
  let query = { branchId }
  
  // Text search
  if (filters.search) {
    query.$or = [
      { truckNumber: { $regex: filters.search, $options: 'i' } },
      { transporterName: { $regex: filters.search, $options: 'i' } }
    ]
  }
  
  // Status filter
  if (filters.status && filters.status.length > 0) {
    query.status = { $in: filters.status }
  }
  
  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    query.dateLoaded = {}
    if (filters.dateFrom) {
      query.dateLoaded.$gte = new Date(filters.dateFrom)
    }
    if (filters.dateTo) {
      query.dateLoaded.$lte = new Date(filters.dateTo)
    }
  }
  
  // Pagination
  const skip = (filters.page - 1) * filters.limit
  
  const trips = await Trip.find(query)
    .sort({ [filters.sortBy]: filters.sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(filters.limit)
  
  const total = await Trip.countDocuments(query)
  
  return {
    trips,
    pagination: {
      currentPage: filters.page,
      totalPages: Math.ceil(total / filters.limit),
      totalRecords: total,
      limit: filters.limit
    }
  }
}
```

---

## **Error Scenarios & Handling**

### **Scenario 1: Manager Tries to Approve Pending Trip**

```
User Action: Click "Approve" on PENDING trip
  ↓
Validation check: trip.status === "COMPLETED"?
  ↓
NO → Error
  ↓
Response: {
  success: false,
  error: {
    code: "INVALID_STATUS_TRANSITION",
    message: "Trip must be completed before approval"
  }
}
  ↓
UI shows error toast: "Cannot approve - trip not yet completed"
```

### **Scenario 2: Manager Tries to Edit Invoiced Trip**

```
User Action: Click "Edit" on INVOICED trip
  ↓
Validation: trip.status in ["PENDING", "ASSIGNED"]?
  ↓
NO → Error
  ↓
Response: {
  success: false,
  error: {
    code: "TRIP_LOCKED",
    message: "Invoiced trips cannot be edited"
  }
}
  ↓
UI shows error toast: "Cannot edit invoiced trips"
UI disables edit button for INVOICED/PAID trips
```

### **Scenario 3: PDF Generation Fails**

```
User Action: Click "Approve & Invoice"
  ↓
Backend: Generates PDF
  ↓
ERROR: PDF library error
  ↓
Trip NOT updated to INVOICED (transaction rollback)
  ↓
Response: {
  success: false,
  error: {
    code: "PDF_GENERATION_ERROR",
    message: "Failed to generate invoice PDF. Please try again."
  }
}
  ↓
UI shows error toast with retry button
  ↓
User retries after issue resolved
```

---

## **Reporting on Trip Status**

### **Trips in Each Status**
```javascript
async function getTripsStatusBreakdown(branchId, dateRange) {
  const statuses = ["PENDING", "ASSIGNED", "IN_TRANSIT", "COMPLETED", "INVOICED", "PAID"]
  
  const breakdown = {}
  
  for (const status of statuses) {
    breakdown[status] = await Trip.countDocuments({
      branchId,
      status,
      dateLoaded: {
        $gte: new Date(dateRange.from),
        $lte: new Date(dateRange.to)
      }
    })
  }
  
  return breakdown
}

// Returns:
{
  "PENDING": 2,
  "ASSIGNED": 1,
  "IN_TRANSIT": 1,
  "COMPLETED": 0,
  "INVOICED": 5,
  "PAID": 43
}
```

### **Outstanding Invoices**
```javascript
async function getOutstandingInvoices(branchId) {
  return await Trip.find({
    branchId,
    status: "INVOICED"  // Approved but not yet paid
  }).select('tripNumber invoiceNumber transporterName totalAmount approvedAt')
}
```

