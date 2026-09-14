# User Roles & Permissions Matrix

---

## **Role Definitions**

### **1. SUPER_ADMIN**

**Purpose:** System administrator with full control over the platform.

**Responsibilities:**
- Create and manage branch managers
- Monitor company performance
- Generate company-wide reports
- Manage system configuration
- Handle disputes and exceptions
- Access complete audit trails

**Restrictions:**
- None (full access)

---

### **2. BRANCH_MANAGER**

**Purpose:** Manage daily operations for a single branch.

**Responsibilities:**
- Log trips for their branch
- Verify and approve trips for invoicing
- Generate invoices
- Record payments
- View branch reports
- Manage transporters and trucks (optional, phase 2)

**Restrictions:**
- Can only access their assigned branch's data
- Cannot modify invoiced trips
- Cannot see other branches' data
- Cannot create new users

---

## **Permissions Matrix**

| Action | Super Admin | Branch Manager |
|--------|-------------|-----------------|
| **Trip Management** | | |
| Create Trip | ✅ All branches | ✅ Own branch only |
| View Trip | ✅ All | ✅ Own branch |
| Edit Trip | ✅ All (PENDING/ASSIGNED) | ✅ Own branch (PENDING/ASSIGNED) |
| Delete Trip | ✅ All (PENDING only) | ✅ Own branch (PENDING only) |
| View Audit Trail | ✅ All | ✅ Own branch |
| Change Trip Status | ✅ All | ✅ Own branch |
| **Approval & Invoicing** | | |
| Approve Trip | ✅ All branches | ✅ Own branch |
| View Invoice | ✅ All | ✅ Own branch |
| Download Invoice PDF | ✅ All | ✅ Own branch |
| Mark as Paid | ✅ All branches | ✅ Own branch |
| **Reporting** | | |
| Branch Report (own branch) | ✅ | ✅ |
| Branch Report (other branches) | ✅ All | ❌ |
| Company Report | ✅ All | ❌ |
| Outstanding Invoices (own) | ✅ | ✅ |
| Outstanding Invoices (all) | ✅ All | ❌ |
| Export Reports | ✅ All | ✅ Own branch |
| **User Management** | | |
| View All Users | ✅ | ✅ Own branch only |
| Create User | ✅ All roles | ❌ |
| Edit User | ✅ All | ❌ |
| Delete User | ✅ | ❌ |
| Manage Permissions | ✅ | ❌ |
| Reset Password | ✅ Any user | ✅ Own password |
| **Branch Management** | | |
| View All Branches | ✅ | ✅ Own branch |
| Create Branch | ✅ | ❌ |
| Edit Branch | ✅ | ✅ Own (limited: phone, email only) |
| View Branch Stats | ✅ All | ✅ Own branch |
| **Audit & Compliance** | | |
| View All Audit Logs | ✅ | ❌ |
| View Branch Audit Logs | ✅ All | ✅ Own branch |
| Export Audit Trail | ✅ All | ✅ Own branch |
| View System Logs | ✅ | ❌ |
| **System Configuration** | | |
| Manage Settings | ✅ | ❌ |
| View System Health | ✅ | ❌ |
| Database Backups | ✅ | ❌ |
| API Key Management | ✅ | ❌ |

---

## **Data Access Rules**

### **SUPER_ADMIN**
```javascript
// Can query all data across all branches
GET /trips → returns ALL trips
GET /reports/company-overview → returns company-wide data
GET /branches → returns all branches
GET /auditlogs → returns all audit logs
```

### **BRANCH_MANAGER**
```javascript
// Can only query own branch data
GET /trips → filters to branchId = user.branchId
GET /reports/branch-summary → shows only own branch
GET /branches/:branchId → only if branchId === user.branchId
GET /auditlogs → filters to own branch only

// If attempt to access another branch:
GET /trips?branchId=OTHER_BRANCH_ID
→ Returns 403 Forbidden with message: "You can only access your assigned branch"
```

---

## **Authentication & Authorization Flow**

### **Login Process**

```
1. User enters email + password
2. Backend verifies credentials
3. If valid:
   - Generate JWT token (valid 24 hours)
   - Generate refresh token (valid 7 days)
   - Return user info with role and branchId
4. Frontend stores tokens in secure HTTP-only cookies
5. Every API request includes JWT in Authorization header:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **JWT Token Payload**

```javascript
{
  iat: 1642000000,           // Issued at
  exp: 1642086400,           // Expires at (24 hours later)
  userId: "ObjectId",
  email: "john@company.com",
  firstName: "John",
  role: "BRANCH_MANAGER",
  branchId: "ObjectId",
  permissions: [
    "trip:create:own_branch",
    "trip:read:own_branch",
    "trip:update:own_branch",
    "invoice:approve:own_branch",
    "report:read:own_branch"
  ]
}
```

### **Authorization Middleware**

```javascript
// Pseudo-code for API protection

middleware.requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ error: "No token" })
  
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}

middleware.requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" })
    }
    next()
  }
}

middleware.requireOwnBranch = (req, res, next) => {
  const requestedBranchId = req.query.branchId || req.body.branchId
  
  if (req.user.role === "BRANCH_MANAGER") {
    if (requestedBranchId && requestedBranchId !== req.user.branchId) {
      return res.status(403).json({ error: "Cannot access other branches" })
    }
  }
  next()
}

// Usage in routes:
router.get("/trips", 
  middleware.requireAuth,
  middleware.requireOwnBranch,
  getTripHandler
)

router.post("/users",
  middleware.requireAuth,
  middleware.requireRole(["SUPER_ADMIN"]),
  createUserHandler
)
```

---

## **Session Management**

### **Session Timeout**
- Session expires after 24 hours
- User automatically logged out
- Refresh token can extend session (7 day max from initial login)

### **Remember Device**
- If user checks "Remember Device", refresh token valid for 30 days
- User doesn't need to re-enter password

### **Concurrent Sessions**
- Multiple devices allowed per user
- Each device gets separate refresh token
- Logout on one device doesn't affect others
- User can view active sessions and logout remotely (future feature)

---

## **Password Policy**

### **Requirements**
- Minimum 8 characters
- Must include uppercase letter (A-Z)
- Must include lowercase letter (a-z)
- Must include number (0-9)
- Cannot contain email address

### **Example Valid Passwords**
- `SecurePass123`
- `Congo2024Logistics`
- `Manager@Branch01`

### **Example Invalid Passwords**
- `password` (too simple)
- `john@123` (contains email)
- `Pass123` (7 characters)

### **Password Change**
- Branch manager can change own password anytime
- Super admin can reset any user's password
- Password change requires old password (except admin reset)
- Changed password invalidates all active sessions

---

## **Two-Factor Authentication (Future Enhancement)**

### **Phase 2 Implementation Plan**
```
1. User logs in with email + password
2. System sends OTP to registered phone number
3. User enters OTP in app
4. Session created with MFA verified flag
5. Same OTP-based re-authentication if session expires
```

---

## **Audit Trail for User Actions**

Every user action is logged:

```javascript
{
  _id: ObjectId,
  userId: "ObjectId of user",
  userName: "John Manager",
  userRole: "BRANCH_MANAGER",
  action: "CREATE_TRIP",
  entityType: "TRIP",
  entityId: "ObjectId of trip",
  timestamp: "2024-01-10T08:15:00Z",
  ipAddress: "192.168.1.100",
  details: {
    tripNumber: "TRIP-2024-001-KIN",
    truckNumber: "1093AX05",
    totalAmount: 1805000
  },
  status: "SUCCESS" // or FAILURE
}
```

---

## **Special Scenarios**

### **Scenario 1: Branch Manager Calls Super Admin for Help**

**Situation:** Branch manager cannot approve a trip due to error

**Actions Super Admin Can Take:**
- View the trip in detail
- See full audit trail
- Edit trip fields if needed
- Manually mark as approved
- Generate replacement invoice
- All actions logged with super admin name

---

### **Scenario 2: Dispute Between Transporter & Manager**

**Situation:** Transporter disputes invoice amount

**Super Admin Resolution Steps:**
1. View complete audit trail of trip
2. See all changes made by branch manager
3. Before/after values of each field change
4. Export audit trail as PDF for transporter
5. If error found: reverse invoice, correct data, re-approve
6. All corrections logged for compliance

---

### **Scenario 3: Multi-Branch Manager (Future)**

**Situation:** Single manager manages 2+ branches

**Proposed Implementation:**
- User.branchIds = [ObjectId, ObjectId, ...]
- Dashboard shows branch selector dropdown
- All queries filter to selected branch
- Audit logs show which branch was being managed at time of action

---

## **API Response Examples**

### **Authorized Request**

```
GET /trips
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response (200 OK):
{
  "success": true,
  "data": [
    { ... trip data filtered to user's branch ... }
  ]
}
```

### **Unauthorized Request (No Token)**

```
GET /trips
(no Authorization header)

Response (401 Unauthorized):
{
  "success": false,
  "error": {
    "code": "NO_AUTH_TOKEN",
    "message": "Authentication required. Please log in."
  }
}
```

### **Forbidden Request (Insufficient Permission)**

```
GET /users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (BRANCH_MANAGER token)

Response (403 Forbidden):
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "Only super admin can view all users"
  }
}
```

### **Forbidden Request (Cross-Branch Access)**

```
GET /trips?branchId=OTHER_BRANCH
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (BRANCH_MANAGER token for different branch)

Response (403 Forbidden):
{
  "success": false,
  "error": {
    "code": "CROSS_BRANCH_ACCESS",
    "message": "You can only access your assigned branch"
  }
}
```

---

## **Security Best Practices**

### **Frontend (React)**
```javascript
// Store tokens securely
// ✅ DO: HTTP-only cookies (set by backend)
// ❌ DON'T: localStorage (vulnerable to XSS)

// Check user role before rendering
{user.role === "SUPER_ADMIN" && <AdminDashboard />}

// Show "Unauthorized" message for 403 errors
if (error.status === 403) {
  showNotification("You don't have permission to access this")
}
```

### **Backend (Node.js)**
```javascript
// Always verify token
// Always check user.branchId matches request
// Always log who did what and when
// Always use HTTPS for API calls
// Always hash passwords with bcrypt
// Always validate user input on server-side
```

---

## **Permission Denial Messages**

These messages appear to users when they lack permission:

| Scenario | Message |
|----------|---------|
| Not logged in | "Please log in to continue" |
| Session expired | "Your session has expired. Please log in again" |
| Wrong role | "You don't have permission to perform this action" |
| Cross-branch access | "You can only access your assigned branch" |
| Editing invoiced trip | "Trips cannot be edited after invoicing" |
| Deleting non-pending trip | "Only pending trips can be deleted" |
| Accessing another user's data | "You don't have access to this data" |

