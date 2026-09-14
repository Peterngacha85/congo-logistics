# Database Schema - MongoDB

**Database Name:** `congo_logistics_db`  
**ODM:** Mongoose (Node.js)  

---

## **Collections Overview**

1. **users** - System users (branch managers, super admin)
2. **branches** - Company branches/locations
3. **trips** - Transportation trips (core entity)
4. **trucks** - Vehicle registry
5. **transporters** - Transporter/driver registry
6. **invoices** - Generated invoices
7. **auditlogs** - Complete change history
8. **payments** - Payment tracking

---

## **1. Users Collection**

Stores authentication and authorization info.

```javascript
{
  _id: ObjectId,
  
  // Personal Info
  firstName: String,          // e.g., "John"
  lastName: String,           // e.g., "Doe"
  email: String,              // unique, indexed, e.g., "john@company.com"
  phone: String,              // optional
  
  // Authentication
  password: String,           // bcrypt hashed, never expose
  passwordLastChanged: Date,  // track for security
  
  // Authorization
  role: String,               // Enum: SUPER_ADMIN, BRANCH_MANAGER
  branchId: ObjectId,         // Reference to Branch (null if SUPER_ADMIN)
  status: String,             // Enum: ACTIVE, INACTIVE, SUSPENDED
  
  // Session Management
  lastLogin: Date,
  loginAttempts: Number,      // reset after successful login
  lockedUntil: Date,          // lock account after 5 failed attempts
  refreshTokens: [String],    // JWT refresh tokens for multiple devices
  
  // Metadata
  createdAt: Date,            // auto
  updatedAt: Date,            // auto
  createdBy: ObjectId,        // Reference to User (super admin who created)
  isDeleted: Boolean          // soft delete
}

// Indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ branchId: 1 })
db.users.createIndex({ role: 1 })
db.users.createIndex({ status: 1 })
```

---

## **2. Branches Collection**

Stores branch/location information.

```javascript
{
  _id: ObjectId,
  
  // Basic Info
  branchName: String,         // e.g., "Kinshasa Hub", "Lubumbashi Terminal"
  branchCode: String,         // e.g., "KIN-001", unique
  location: String,           // City/region
  
  // Contact
  address: String,
  phone: String,
  email: String,
  
  // Management
  managerId: ObjectId,        // Reference to User (primary manager)
  coManagerIds: [ObjectId],   // Additional managers
  
  // Operations
  isActive: Boolean,          // Can be deactivated
  operationalCosts: {
    estimatedMonthly: Number  // For reporting
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId
}

// Indexes
db.branches.createIndex({ branchCode: 1 }, { unique: true })
db.branches.createIndex({ managerId: 1 })
db.branches.createIndex({ isActive: 1 })
```

---

## **3. Trips Collection** (CORE)

The main entity tracking all transportation jobs.

```javascript
{
  _id: ObjectId,
  
  // Trip Identification
  tripNumber: String,         // Auto-generated e.g., "TRIP-2024-001-KIN", unique
  invoiceNumber: String,      // Unique, auto-generated when INVOICED, indexed
  
  // Vehicle & Transporter
  truckNumber: String,        // Required, e.g., "1093AX05", indexed
  truckId: ObjectId,          // Reference to Trucks collection (optional)
  trailerNumber: String,      // Optional
  transporterName: String,    // Required, indexed, e.g., "Ahmed Hassan"
  transporterId: ObjectId,    // Reference to Transporters (optional, future)
  
  // Route & Dates
  loadingPoint: String,       // Required, e.g., "Kinshasa Port"
  offloadingPoint: String,    // Required, e.g., "Lubumbashi Warehouse"
  dateLoaded: Date,           // Required, indexed
  dateOffloaded: Date,        // Required, indexed (can be null until completed)
  
  // Financial
  transportationRate: Number, // CDF, required, e.g., 1000000
  dieselPerTrip: Number,      // CDF, required, e.g., 500000
  mileageCash: Number,        // CDF, required, e.g., 200000
  serviceFee: Number,         // Auto-calculated: (rate + diesel + mileage) * 0.05
  totalAmount: Number,        // Auto-calculated: rate + diesel + mileage + serviceFee
  
  // Status & Workflow
  status: String,             // Enum: PENDING, ASSIGNED, IN_TRANSIT, COMPLETED, INVOICED, PAID
                              // Indexed for fast filtering
  statusHistory: [
    {
      status: String,
      changedAt: Date,
      changedBy: ObjectId     // Reference to User
    }
  ],
  
  // Approval & Invoicing
  approvedBy: ObjectId,       // Reference to User who approved
  approvedAt: Date,
  invoiceGeneratedAt: Date,   // When invoice PDF was created
  invoicePath: String,        // Server path to PDF file
  
  // Payment Tracking
  paymentStatus: String,      // Enum: PENDING, PARTIAL, PAID
  paymentDetails: {
    paymentDate: Date,        // When payment received
    paymentMethod: String,    // Enum: MOBILE_MONEY, BANK_TRANSFER, CASH
    amountPaid: Number,       // CDF, default = totalAmount
    confirmationRef: String,  // e.g., transaction ID
    recordedBy: ObjectId,     // User who recorded payment
    recordedAt: Date
  },
  
  // Branch Assignment
  branchId: ObjectId,         // Required, indexed, reference to Branch
  
  // Metadata
  createdAt: Date,            // auto
  updatedAt: Date,            // auto
  createdBy: ObjectId,        // Reference to User (branch manager who logged)
  notes: String,              // Optional additional info
  
  // Audit
  lastModifiedAt: Date,
  lastModifiedBy: ObjectId
}

// Indexes (critical for performance)
db.trips.createIndex({ tripNumber: 1 }, { unique: true })
db.trips.createIndex({ invoiceNumber: 1 }, { sparse: true, unique: true })
db.trips.createIndex({ truckNumber: 1 })
db.trips.createIndex({ transporterName: 1 })
db.trips.createIndex({ branchId: 1 })
db.trips.createIndex({ status: 1 })
db.trips.createIndex({ dateLoaded: 1 })
db.trips.createIndex({ dateOffloaded: 1 })
db.trips.createIndex({ createdAt: 1 })
db.trips.createIndex({ branchId: 1, status: 1 })  // Composite for branch + status queries
db.trips.createIndex({ branchId: 1, dateLoaded: 1, dateOffloaded: 1 })  // For date range reports
```

---

## **4. Trucks Collection**

Vehicle registry for reference and future tracking.

```javascript
{
  _id: ObjectId,
  
  // Vehicle Identification
  truckNumber: String,        // e.g., "1093AX05", unique, indexed
  trailerNumber: String,      // Optional
  registrationExpiry: Date,   // Insurance/license tracking
  
  // Vehicle Details
  make: String,               // e.g., "Volvo"
  model: String,              // e.g., "FH16"
  year: Number,
  licensePlate: String,       // Indexed
  vin: String,                // Vehicle Identification Number
  
  // Ownership
  ownerName: String,
  ownerPhone: String,
  
  // Operations
  branchId: ObjectId,         // Primary branch assignment
  status: String,             // Enum: ACTIVE, INACTIVE, MAINTENANCE, RETIRED
  totalTripsCompleted: Number,// Denormalized counter for quick stats
  
  // Tracking (Phase 2)
  gpsDeviceId: String,        // For Navi Africa integration (future)
  hasGPS: Boolean,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.trucks.createIndex({ truckNumber: 1 }, { unique: true })
db.trucks.createIndex({ branchId: 1 })
db.trucks.createIndex({ status: 1 })
db.trucks.createIndex({ licensePlate: 1 })
```

---

## **5. Transporters Collection**

Transporter/driver registry.

```javascript
{
  _id: ObjectId,
  
  // Personal Info
  name: String,               // e.g., "Ahmed Hassan", indexed
  phone: String,              // indexed
  email: String,
  
  // Address
  city: String,
  region: String,
  
  // Payment Info
  bankName: String,           // For bank transfers
  bankAccount: String,        // Encrypted (sensitive)
  mobileMoneyNumber: String,  // For mobile money payments, encrypted
  
  // Status
  status: String,             // Enum: ACTIVE, INACTIVE, SUSPENDED
  
  // Statistics (denormalized for speed)
  totalTrips: Number,
  totalEarnings: Number,      // CDF
  averageRating: Number,      // For future: 1-5 star system
  
  // Branch Assignment
  branchIds: [ObjectId],      // Can work for multiple branches
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.transporters.createIndex({ name: 1 })
db.transporters.createIndex({ phone: 1 }, { sparse: true })
db.transporters.createIndex({ status: 1 })
```

---

## **6. Invoices Collection**

Invoice record and metadata.

```javascript
{
  _id: ObjectId,
  
  // Invoice Identification
  invoiceNumber: String,      // Unique, indexed
  tripId: ObjectId,           // Reference to Trip, indexed
  
  // Invoice Details
  invoiceDate: Date,
  dueDate: Date,              // e.g., 30 days after invoice
  
  // Transporter Info
  transporterName: String,
  transporterId: ObjectId,    // Reference (optional)
  
  // Line Items
  lineItems: [
    {
      description: String,    // e.g., "Transportation Rate"
      amount: Number          // CDF
    }
  ],
  
  // Totals
  subtotal: Number,           // Rate + Diesel + Mileage (CDF)
  serviceFee: Number,         // 5% of subtotal (CDF)
  totalAmount: Number,        // Subtotal + Service Fee (CDF)
  
  // Status
  status: String,             // Enum: DRAFT, ISSUED, PAID, PARTIALLY_PAID, OVERDUE
  paymentReceivedAt: Date,    // When payment was recorded
  
  // File
  pdfPath: String,            // Server path to PDF file
  pdfGeneratedAt: Date,
  pdfGeneratedBy: ObjectId,   // User who generated
  
  // Branch
  branchId: ObjectId,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId         // Manager who approved trip
}

// Indexes
db.invoices.createIndex({ invoiceNumber: 1 }, { unique: true })
db.invoices.createIndex({ tripId: 1 })
db.invoices.createIndex({ branchId: 1 })
db.invoices.createIndex({ status: 1 })
db.invoices.createIndex({ invoiceDate: 1 })
```

---

## **7. AuditLogs Collection** (CRITICAL FOR COMPLIANCE)

Complete, immutable record of all changes.

```javascript
{
  _id: ObjectId,
  
  // What Changed
  entityType: String,         // Enum: TRIP, USER, INVOICE, PAYMENT, etc., indexed
  entityId: ObjectId,         // ID of the entity being changed
  action: String,             // Enum: CREATE, UPDATE, DELETE, APPROVE, INVOICE, MARK_PAID
  
  // Who Changed It
  userId: ObjectId,           // Reference to User, indexed
  userName: String,           // Denormalized for quick display
  userRole: String,           // SUPER_ADMIN, BRANCH_MANAGER
  
  // When
  timestamp: Date,            // Precise timestamp, indexed
  ipAddress: String,          // Optional, for security
  
  // What Changed (detailed)
  changes: {
    // For CREATE: entire new object
    // For UPDATE: fieldName: { oldValue, newValue }
    // For DELETE: "deletedAt" : Date
  },
  
  // Example for TRIP UPDATE:
  // {
  //   "status": { "oldValue": "PENDING", "newValue": "ASSIGNED" },
  //   "approvedBy": { "oldValue": null, "newValue": "ObjectId(...)" },
  //   "updatedAt": { "oldValue": "2024-01-10T10:00:00Z", "newValue": "2024-01-10T11:30:00Z" }
  // }
  
  // Context
  branchId: ObjectId,         // indexed, which branch was affected
  description: String,        // Human-readable: "Trip TRIP-2024-001 status changed from PENDING to INVOICED"
  
  // Metadata
  createdAt: Date             // immutable
}

// Indexes (for audit trail queries)
db.auditlogs.createIndex({ entityId: 1, timestamp: -1 })
db.auditlogs.createIndex({ userId: 1, timestamp: -1 })
db.auditlogs.createIndex({ branchId: 1, timestamp: -1 })
db.auditlogs.createIndex({ entityType: 1, action: 1 })
db.auditlogs.createIndex({ timestamp: 1 })
```

---

## **8. Payments Collection** (Optional, Phase 2)

Separate payment tracking for reconciliation.

```javascript
{
  _id: ObjectId,
  
  // Payment Identification
  paymentId: String,          // Unique, e.g., "PAY-2024-0001"
  invoiceId: ObjectId,        // Reference to Invoice, indexed
  tripId: ObjectId,           // Reference to Trip, indexed
  
  // Payment Details
  paymentDate: Date,          // When payment was made, indexed
  paymentMethod: String,      // MOBILE_MONEY, BANK_TRANSFER, CASH
  amountPaid: Number,         // CDF
  transactionRef: String,     // Mobile money or bank ref
  
  // Transporter
  transporterId: ObjectId,
  transporterName: String,
  
  // Branch
  branchId: ObjectId,         // indexed
  
  // Reconciliation
  reconciled: Boolean,        // Has accounting verified this?
  reconciledBy: ObjectId,
  reconciledAt: Date,
  
  // Metadata
  recordedBy: ObjectId,       // User who logged payment
  recordedAt: Date,
  notes: String               // e.g., "Partial payment, balance pending"
}

// Indexes
db.payments.createIndex({ invoiceId: 1 })
db.payments.createIndex({ tripId: 1 })
db.payments.createIndex({ branchId: 1, paymentDate: -1 })
db.payments.createIndex({ paymentDate: 1 })
db.payments.createIndex({ reconciled: 1 })
```

---

## **Data Relationships Diagram**

```
┌─────────────┐
│    Users    │
└──────┬──────┘
       │ createdBy
       │
       ├─→ Branches (many branch managers per admin)
       │
       └─→ Trips (createdBy, approvedBy)
              │
              ├─→ Invoices (via tripId)
              │     └─→ Payments
              │
              └─→ AuditLogs (userId, entityId)
                  
Trucks ─→ Trips (via truckNumber, optional truckId)
Transporters ─→ Trips (via transporterName, optional transporterId)
```

---

## **Indexes Summary**

**Critical Performance Indexes:**
- `trips.branchId` - Filter by branch
- `trips.status` - Filter by status (INVOICED, PENDING, etc.)
- `trips.dateLoaded` - Date range queries
- `trips.truckNumber` - Search by truck
- `trips.transporterName` - Search by transporter
- `trips.createdAt` - Time-based sorting and filtering
- `auditlogs.entityId + timestamp` - Retrieve audit trail for a trip
- `users.email` - Unique, login
- `invoices.invoiceNumber` - Unique invoice lookup
- `branches.branchCode` - Unique branch identification

**Denormalization Strategy:**
- Store `transporterName` on Trip (avoid joins during reporting)
- Store `userName` on AuditLog (avoid user lookup for audit display)
- Store `totalTrips` on Transporter (quick stats without aggregation)
- Store `totalTrips` on Truck (fleet statistics)

---

## **Data Retention Policy**

- **Trips**: Keep indefinitely (financial records for 7 years minimum)
- **AuditLogs**: Keep indefinitely (immutable compliance record)
- **Users**: Archive inactive users after 2 years
- **Invoices**: Keep indefinitely (tax/audit requirement)
- **Payments**: Keep indefinitely

---

## **Security Considerations**

1. **Sensitive Data Encryption:**
   - `users.password` - Always hashed, never stored as plaintext
   - `transporters.bankAccount` - Encrypted at rest
   - `transporters.mobileMoneyNumber` - Encrypted at rest

2. **Access Control:**
   - Branch managers can only query their own branchId
   - Super admin can query all
   - Implemented at API middleware level

3. **Audit Trail Immutability:**
   - AuditLogs collection set to never allow updates/deletes
   - Only inserts permitted

4. **Soft Deletes:**
   - Users: use `isDeleted` flag instead of hard delete
   - Maintains referential integrity for audit logs

---

## **Backup & Recovery**

- Daily full database backups
- Point-in-time recovery capability
- Offsite backup storage
- Test restores monthly

