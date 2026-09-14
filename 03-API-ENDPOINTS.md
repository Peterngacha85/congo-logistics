# API Endpoints Specification

**Base URL:** `https://api.congoLogistics.com/api`  
**API Version:** `v1`  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`  

---

## **Authentication Endpoints**

### **POST /auth/register**
Register a new user (Super Admin only)

```
Request:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "phone": "+243xxxxxxxxx",
  "password": "securePassword123",
  "role": "BRANCH_MANAGER",
  "branchId": "ObjectId"
}

Response (201 Created):
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "_id": "ObjectId",
    "firstName": "John",
    "email": "john@company.com",
    "role": "BRANCH_MANAGER",
    "branchId": "ObjectId"
  }
}

Errors:
- 400: Email already exists
- 400: Invalid input
- 403: Only super admin can create users
```

---

### **POST /auth/login**
User login

```
Request:
{
  "email": "john@company.com",
  "password": "securePassword123",
  "rememberMe": false
}

Response (200 OK):
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "ObjectId",
    "firstName": "John",
    "email": "john@company.com",
    "role": "BRANCH_MANAGER",
    "branchId": "ObjectId"
  }
}

Errors:
- 401: Invalid email or password
- 401: Account locked (5 failed attempts)
- 404: User not found
```

---

### **POST /auth/refresh**
Refresh JWT token

```
Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200 OK):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Errors:
- 401: Invalid refresh token
- 401: Refresh token expired
```

---

### **POST /auth/logout**
Logout user

```
Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## **Trip Endpoints**

### **GET /trips**
Get all trips (branch manager sees only their branch, super admin sees all)

```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 50)
- status: string (PENDING, ASSIGNED, IN_TRANSIT, COMPLETED, INVOICED, PAID)
- branchId: ObjectId (super admin only)
- search: string (truck number or transporter name)
- dateFrom: ISO date
- dateTo: ISO date
- sortBy: string (dateLoaded, dateOffloaded, createdAt, status)
- sortOrder: asc | desc

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "tripNumber": "TRIP-2024-001-KIN",
      "truckNumber": "1093AX05",
      "transporterName": "Ahmed Hassan",
      "loadingPoint": "Kinshasa Port",
      "offloadingPoint": "Lubumbashi Warehouse",
      "status": "COMPLETED",
      "totalAmount": 2100000,
      "dateLoaded": "2024-01-10T08:00:00Z",
      "dateOffloaded": "2024-01-12T14:30:00Z",
      "createdAt": "2024-01-10T08:15:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 245,
    "limit": 50
  }
}

Errors:
- 400: Invalid query parameters
- 403: Unauthorized (branch manager accessing another branch)
```

---

### **GET /trips/:tripId**
Get trip details with full audit trail

```
Response (200 OK):
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "tripNumber": "TRIP-2024-001-KIN",
    "truckNumber": "1093AX05",
    "trailerNumber": "TR-001",
    "transporterName": "Ahmed Hassan",
    "loadingPoint": "Kinshasa Port",
    "offloadingPoint": "Lubumbashi Warehouse",
    "dateLoaded": "2024-01-10T08:00:00Z",
    "dateOffloaded": "2024-01-12T14:30:00Z",
    "transportationRate": 1000000,
    "dieselPerTrip": 500000,
    "mileageCash": 200000,
    "serviceFee": 105000,
    "totalAmount": 1805000,
    "status": "COMPLETED",
    "branchId": "ObjectId",
    "createdBy": {
      "_id": "ObjectId",
      "name": "John Manager"
    },
    "auditTrail": [
      {
        "_id": "ObjectId",
        "action": "CREATE",
        "changes": { "status": "PENDING" },
        "timestamp": "2024-01-10T08:15:00Z",
        "user": { "name": "John Manager", "email": "john@company.com" }
      },
      {
        "_id": "ObjectId",
        "action": "UPDATE",
        "changes": { "status": { "oldValue": "PENDING", "newValue": "ASSIGNED" } },
        "timestamp": "2024-01-10T09:00:00Z",
        "user": { "name": "John Manager" }
      }
    ]
  }
}

Errors:
- 404: Trip not found
- 403: Unauthorized (branch manager accessing another branch's trip)
```

---

### **POST /trips**
Create a new trip

```
Request:
{
  "truckNumber": "1093AX05",
  "trailerNumber": "TR-001",
  "loadingPoint": "Kinshasa Port",
  "offloadingPoint": "Lubumbashi Warehouse",
  "dateLoaded": "2024-01-10T08:00:00Z",
  "dateOffloaded": "2024-01-12T14:30:00Z",
  "transporterName": "Ahmed Hassan",
  "transportationRate": 1000000,
  "dieselPerTrip": 500000,
  "mileageCash": 200000,
  "branchId": "ObjectId"
}

Response (201 Created):
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "_id": "ObjectId",
    "tripNumber": "TRIP-2024-001-KIN",
    "status": "PENDING",
    "totalAmount": 1805000,
    "createdAt": "2024-01-10T08:15:00Z"
  }
}

Validation Errors:
- 400: Truck number already logged today for this branch
- 400: Date offloaded cannot be before date loaded
- 400: Missing required fields
- 400: Invalid numeric values
```

---

### **PUT /trips/:tripId**
Update a trip (only PENDING or ASSIGNED trips)

```
Request:
{
  "truckNumber": "1093AX05",
  "transportationRate": 1100000,
  "dieselPerTrip": 520000,
  "mileageCash": 210000,
  "notes": "Updated due to route change"
}

Response (200 OK):
{
  "success": true,
  "message": "Trip updated successfully",
  "data": {
    "_id": "ObjectId",
    "tripNumber": "TRIP-2024-001-KIN",
    "totalAmount": 1879500,
    "updatedAt": "2024-01-10T10:30:00Z"
  }
}

Errors:
- 400: Cannot edit trip with status INVOICED or PAID
- 400: Invalid update data
- 403: Unauthorized
- 404: Trip not found
```

---

### **DELETE /trips/:tripId**
Delete a trip (only PENDING status)

```
Response (200 OK):
{
  "success": true,
  "message": "Trip deleted successfully"
}

Errors:
- 400: Cannot delete trips with status ASSIGNED or later
- 403: Unauthorized
- 404: Trip not found
```

---

### **PUT /trips/:tripId/status**
Update trip status

```
Request:
{
  "status": "ASSIGNED",
  "notes": "Assigned to truck 1093AX05"
}

Response (200 OK):
{
  "success": true,
  "message": "Trip status updated to ASSIGNED",
  "data": {
    "status": "ASSIGNED",
    "statusHistory": [
      { "status": "PENDING", "changedAt": "2024-01-10T08:15:00Z" },
      { "status": "ASSIGNED", "changedAt": "2024-01-10T10:30:00Z" }
    ]
  }
}

Errors:
- 400: Invalid status transition
- 400: Cannot transition backwards
- 403: Unauthorized
- 404: Trip not found
```

---

## **Approval & Invoicing Endpoints**

### **PUT /trips/:tripId/approve**
Approve a trip and generate invoice

```
Request:
{}

Response (200 OK):
{
  "success": true,
  "message": "Trip approved and invoice generated",
  "data": {
    "tripId": "ObjectId",
    "status": "INVOICED",
    "invoiceNumber": "INV-2024-001-KIN",
    "invoicePath": "/invoices/INV-2024-001-KIN_1093AX05_2024-01-12.pdf",
    "invoiceGeneratedAt": "2024-01-12T15:00:00Z",
    "totalAmount": 1805000,
    "approvedBy": "John Manager"
  }
}

Errors:
- 400: Trip must be in COMPLETED status
- 400: Cannot approve already invoiced trip
- 500: PDF generation failed
- 403: Unauthorized
```

---

### **GET /trips/:tripId/invoice/download**
Download invoice PDF

```
Response:
- 200: PDF file (Content-Type: application/pdf)
- 404: Invoice not found
- 403: Unauthorized
```

---

### **PUT /trips/:tripId/mark-paid**
Mark trip as paid

```
Request:
{
  "paymentDate": "2024-01-15T10:00:00Z",
  "paymentMethod": "MOBILE_MONEY",
  "confirmationRef": "MTN-20240115-00123",
  "notes": "Payment received via MTN Money"
}

Response (200 OK):
{
  "success": true,
  "message": "Trip marked as paid",
  "data": {
    "tripId": "ObjectId",
    "status": "PAID",
    "paymentDetails": {
      "paymentDate": "2024-01-15T10:00:00Z",
      "paymentMethod": "MOBILE_MONEY",
      "amountPaid": 1805000,
      "confirmationRef": "MTN-20240115-00123"
    }
  }
}

Errors:
- 400: Trip must be in INVOICED status
- 400: Payment date cannot be in future
- 403: Unauthorized
```

---

## **Invoice Endpoints**

### **GET /invoices**
Get all invoices

```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 50)
- status: DRAFT, ISSUED, PAID, PARTIALLY_PAID, OVERDUE
- branchId: ObjectId (super admin only)
- dateFrom: ISO date
- dateTo: ISO date

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "invoiceNumber": "INV-2024-001-KIN",
      "tripNumber": "TRIP-2024-001-KIN",
      "transporterName": "Ahmed Hassan",
      "totalAmount": 1805000,
      "status": "PAID",
      "invoiceDate": "2024-01-12T15:00:00Z",
      "paidAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### **GET /invoices/:invoiceId**
Get invoice details

```
Response (200 OK):
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "invoiceNumber": "INV-2024-001-KIN",
    "tripNumber": "TRIP-2024-001-KIN",
    "tripId": "ObjectId",
    "invoiceDate": "2024-01-12T15:00:00Z",
    "dueDate": "2024-02-11T15:00:00Z",
    "transporterName": "Ahmed Hassan",
    "loadingPoint": "Kinshasa Port",
    "offloadingPoint": "Lubumbashi Warehouse",
    "lineItems": [
      { "description": "Transportation Rate", "amount": 1000000 },
      { "description": "Diesel Per Trip", "amount": 500000 },
      { "description": "Mileage Cash", "amount": 200000 }
    ],
    "subtotal": 1700000,
    "serviceFee": 85000,
    "totalAmount": 1805000,
    "status": "PAID",
    "paymentReceivedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## **Reports Endpoints**

### **GET /reports/branch-summary**
Get branch summary report

```
Query Parameters:
- branchId: ObjectId (required for branch manager, optional for super admin)
- dateFrom: ISO date (required)
- dateTo: ISO date (required)
- format: json | csv

Response (200 OK):
{
  "success": true,
  "data": {
    "branch": {
      "_id": "ObjectId",
      "branchName": "Kinshasa Hub",
      "manager": "John Doe"
    },
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "summary": {
      "totalTrips": 45,
      "completedTrips": 43,
      "totalRevenue": 5000000,
      "totalExpenses": {
        "diesel": 1200000,
        "mileage": 800000,
        "serviceFees": 262000
      },
      "netProfit": 2738000,
      "averageTripValue": 111111
    },
    "byStatus": {
      "PENDING": 0,
      "ASSIGNED": 1,
      "IN_TRANSIT": 1,
      "COMPLETED": 0,
      "INVOICED": 0,
      "PAID": 43
    },
    "topTransporters": [
      { "name": "Ahmed Hassan", "trips": 12, "revenue": 1500000 },
      { "name": "Joseph Mwangi", "trips": 10, "revenue": 1200000 }
    ]
  }
}

Format: csv response will be a downloadable CSV file
```

---

### **GET /reports/company-overview**
Get company-wide report (Super Admin only)

```
Query Parameters:
- dateFrom: ISO date
- dateTo: ISO date
- format: json | csv

Response (200 OK):
{
  "success": true,
  "data": {
    "period": { "from": "2024-01-01", "to": "2024-01-31" },
    "totalTrips": 185,
    "totalRevenue": 21500000,
    "totalExpenses": 4800000,
    "netProfit": 16700000,
    "branchBreakdown": [
      {
        "branchName": "Kinshasa Hub",
        "trips": 45,
        "revenue": 5000000,
        "expenses": 1200000,
        "profit": 3800000
      },
      {
        "branchName": "Lubumbashi Terminal",
        "trips": 80,
        "revenue": 9200000,
        "expenses": 2100000,
        "profit": 7100000
      }
    ],
    "topPerformers": {
      "branch": "Lubumbashi Terminal",
      "transporter": "Ahmed Hassan",
      "truck": "1093AX05"
    }
  }
}
```

---

### **GET /reports/outstanding-invoices**
Get unpaid invoices

```
Query Parameters:
- branchId: ObjectId
- transporterId: ObjectId (optional)
- overdueOnly: boolean (default: false)

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "invoiceNumber": "INV-2024-001-KIN",
      "transporterName": "Ahmed Hassan",
      "tripNumber": "TRIP-2024-001-KIN",
      "amount": 1805000,
      "invoiceDate": "2024-01-12T15:00:00Z",
      "dueDate": "2024-02-11T15:00:00Z",
      "daysOverdue": 5,
      "status": "OVERDUE"
    }
  ],
  "summary": {
    "totalOutstanding": 8500000,
    "invoiceCount": 5,
    "overdueCount": 2,
    "overdueAmount": 4200000
  }
}
```

---

## **Audit Log Endpoints**

### **GET /auditlogs/trip/:tripId**
Get audit trail for a specific trip

```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 50)

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "action": "CREATE",
      "description": "Trip TRIP-2024-001 created",
      "user": {
        "name": "John Manager",
        "email": "john@company.com",
        "role": "BRANCH_MANAGER"
      },
      "timestamp": "2024-01-10T08:15:00Z",
      "changes": {
        "tripNumber": "TRIP-2024-001-KIN",
        "status": "PENDING",
        "truckNumber": "1093AX05"
      }
    },
    {
      "_id": "ObjectId",
      "action": "UPDATE",
      "description": "Status changed from PENDING to ASSIGNED",
      "user": { "name": "John Manager" },
      "timestamp": "2024-01-10T10:30:00Z",
      "changes": {
        "status": { "oldValue": "PENDING", "newValue": "ASSIGNED" }
      }
    },
    {
      "_id": "ObjectId",
      "action": "APPROVE",
      "description": "Trip approved and invoiced",
      "user": { "name": "John Manager" },
      "timestamp": "2024-01-12T15:00:00Z",
      "changes": {
        "status": { "oldValue": "COMPLETED", "newValue": "INVOICED" },
        "invoiceNumber": "INV-2024-001-KIN",
        "invoiceGeneratedAt": "2024-01-12T15:00:00Z"
      }
    }
  ]
}
```

---

### **GET /auditlogs**
Get all audit logs (Super Admin only, filtered by parameters)

```
Query Parameters:
- entityType: TRIP, USER, INVOICE
- action: CREATE, UPDATE, DELETE, APPROVE, INVOICE, MARK_PAID
- branchId: ObjectId
- userId: ObjectId
- dateFrom: ISO date
- dateTo: ISO date
- page: number
- limit: number

Response (200 OK):
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

---

## **Branch Endpoints**

### **GET /branches**
Get all branches (Super Admin only or manager's own branch)

```
Response (200 OK):
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "branchCode": "KIN-001",
      "branchName": "Kinshasa Hub",
      "location": "Kinshasa",
      "address": "Avenue Kasavubu, Kinshasa",
      "manager": { "name": "John Doe", "email": "john@company.com" },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### **GET /branches/:branchId**
Get branch details

```
Response (200 OK):
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "branchCode": "KIN-001",
    "branchName": "Kinshasa Hub",
    "location": "Kinshasa",
    "address": "Avenue Kasavubu, Kinshasa",
    "phone": "+243xxxxxxxxx",
    "email": "kinshasa@company.com",
    "manager": { ... },
    "stats": {
      "activeTrips": 2,
      "totalTripsThisMonth": 45,
      "monthlyRevenue": 5000000,
      "activeTransporters": 12,
      "activeTrucks": 8
    }
  }
}
```

---

## **Error Handling**

All errors return consistent format:

```
Response (4xx or 5xx):
{
  "success": false,
  "error": {
    "code": "TRIP_NOT_FOUND",
    "message": "Trip with ID XXX not found",
    "details": {}
  }
}

Common Status Codes:
- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error
- 503: Service Unavailable
```

---

## **Rate Limiting**

- 100 requests per 15 minutes per user
- 1000 requests per 15 minutes per IP

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642000000
```

---

## **Pagination Standard**

All list endpoints return pagination info:

```
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "limit": 50,
    "totalRecords": 245,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

