# Requirements & User Stories

---

## **Functional Requirements**

### **FR-1: Trip Management**

**FR-1.1 - Create Trip**
- Branch manager can log a new trip with the following fields:
  - Truck Number (required, e.g., 1093AX05)
  - Trailer Number (required)
  - Loading Point (required, text)
  - Offloading Point (required, text)
  - Date Loaded (required, date picker)
  - Date Offloaded (required, date picker)
  - Transporter Name (required, searchable)
  - Invoice Number (optional, auto-generated option)
  - Transportation Rate (required, numeric CDF)
  - Diesel Per Trip (required, numeric CDF)
  - Mileage Cash (required, numeric CDF)
  - Service Fee (auto-calculated as 5% of subtotal)

- Trip automatically assigned status: **PENDING**
- Branch manager is marked as creator in audit log

**FR-1.2 - Edit Trip (Before Approval)**
- Manager can edit pending/assigned trips
- Once trip status is "INVOICED" or "PAID", no edits allowed
- Every edit logged in audit trail (who changed what, when, old value → new value)

**FR-1.3 - View Trip Details**
- Display all trip information in read-only view
- Show calculated totals:
  - Subtotal = Transportation Rate + Diesel + Mileage
  - Service Fee = 5% of Subtotal
  - **Total = Subtotal + Service Fee**
- Display status timeline (when created, when assigned, when completed, when approved, when invoiced)
- Show all audit log entries for this trip

**FR-1.4 - Delete Trip**
- Only PENDING trips can be deleted
- Deletion is logged as "TRIP_DELETED" in audit trail
- Cannot delete if already invoiced

---

### **FR-2: Trip Status Management**

**FR-2.1 - Status Transitions**
```
PENDING (created) 
  → ASSIGNED (manager marks as assigned to truck)
  → IN_TRANSIT (manager marks as loaded/moving)
  → COMPLETED (manager confirms offloaded)
  → INVOICED (manager approves for billing → auto-generates invoice)
  → PAID (manually marked when payment received)
```

**FR-2.2 - Transition Requirements**
- PENDING → ASSIGNED: Requires manager action, set date
- ASSIGNED → IN_TRANSIT: Requires confirmation
- IN_TRANSIT → COMPLETED: Requires offload date confirmation
- COMPLETED → INVOICED: Manager clicks "Approve" → system generates PDF invoice
- INVOICED → PAID: Manager manually marks with payment method & date

**FR-2.3 - Status Cannot Go Backward**
- Once trip moves forward, cannot revert to previous status
- Only exception: INVOICED can be set back to COMPLETED if invoice was generated in error (rare, fully logged)

---

### **FR-3: Invoice Generation**

**FR-3.1 - Auto-Generate Invoice**
- When trip status changes to INVOICED:
  - System calculates: Subtotal + 5% Service Fee = Total
  - Generates unique invoice number if not already set
  - Creates PDF with:
    - Trip details (truck, loading/offloading points, dates)
    - Transporter name
    - Itemized charges (transportation rate, diesel, mileage, service fee)
    - **Total amount in CDF**
    - Generated date & time
    - Approval signature (branch manager name)
    - QR code linking to trip record (optional, future)

**FR-3.2 - Invoice Storage**
- PDF saved on server with naming: `INVOICE_[invoiceNumber]_[truckNumber]_[date].pdf`
- Invoice record created in database linking to trip
- Invoice viewable/downloadable from trip detail page

**FR-3.3 - Invoice History**
- If invoice regenerated (rare), mark original as superseded
- Keep all versions in audit trail

---

### **FR-4: Authentication & Authorization**

**FR-4.1 - User Roles**
- **SUPER_ADMIN**: Full system access
- **BRANCH_MANAGER**: Access only to their assigned branch

**FR-4.2 - Login System**
- Email + password authentication
- JWT tokens (expires 24 hours)
- Refresh token for persistent sessions
- Password hashing with bcrypt

**FR-4.3 - Access Control**
- Branch manager sees only:
  - Their own branch data
  - Their own trips
  - Their own reports
- Super Admin sees:
  - All branches
  - All trips
  - All users
  - Company-wide reports

**FR-4.4 - Session Management**
- Auto-logout after 30 min inactivity
- Option to stay logged in (remember device)
- Logout clears tokens

---

### **FR-5: Multi-Branch Operations**

**FR-5.1 - Branch Assignment**
- Every trip belongs to exactly one branch
- Every user (branch manager) is assigned to one branch
- Super Admin can view/manage all branches

**FR-5.2 - Branch Manager Dashboard**
- Shows only this branch's trucks and trips
- Displays branch name, manager name, stats
- Quick access: pending approvals, today's trips, weekly revenue

**FR-5.3 - Super Admin Dashboard**
- Dropdown to select branch OR view all branches
- Summary cards: total trips, total revenue, top transporters, branch performance
- Ability to drill down into any branch

---

### **FR-6: Reporting & Analytics**

**FR-6.1 - Branch-Level Reports (Branch Manager)**
- **Daily Summary**: Trips logged today, revenue, pending approvals
- **Weekly Summary**: Total trips, total earnings, expenses, net
- **By Transporter**: How much work each transporter did (trip count, revenue)
- **Trip Status Report**: How many trips in each status
- Date range filter (custom start → end date)
- Export to CSV

**FR-6.2 - Company-Level Reports (Super Admin)**
- All of above, but aggregated across ALL branches
- **Branch Comparison**: Which branch is most profitable
- **Performance Metrics**: 
  - Total trips completed this week/month
  - Revenue vs. expenses
  - Average trip value
  - Cost per branch
- **Transporter Performance**: Across all branches, who's most productive
- Custom date range with export capability

**FR-6.3 - Report Export**
- CSV format for Excel/Google Sheets
- Include all calculated fields and totals
- Filename: `Report_[branchName]_[startDate]_[endDate].csv`

---

### **FR-7: Search & Filter**

**FR-7.1 - Trip Search**
- Search by:
  - Truck Number (partial match, e.g., "1093" matches "1093AX05")
  - Transporter Name (partial match)
- Search is case-insensitive
- Results filtered by branch (manager sees only their branch trips)

**FR-7.2 - Trip Filters**
- Filter by Status (multi-select: PENDING, ASSIGNED, IN_TRANSIT, COMPLETED, INVOICED, PAID)
- Filter by Date Range (loading or offloading date)
- Filter by Branch (Super Admin only)
- Combine filters (e.g., "Show all COMPLETED trips from Jan 1-31 in this branch")

---

### **FR-8: Audit Trail & Compliance**

**FR-8.1 - Complete Audit Logging**
Every trip change logged with:
- **Who**: User ID, Name, Role
- **When**: Timestamp (to the second)
- **What**: Action (CREATE, UPDATE, APPROVE, INVOICE, DELETE, etc.)
- **Change Details**: For updates, show old value → new value for each field
- **Status Change**: Which status to which status
- **Invoice Generation**: When invoice was created, by whom

**FR-8.2 - Audit Trail Visibility**
- Branch Manager: Can view audit trail for their own branch trips
- Super Admin: Can view all audit trails

**FR-8.3 - Audit Trail Cannot Be Edited**
- Immutable log
- No deletion of audit records (except full system backup/rollback)

**FR-8.4 - Compliance Reports**
- Exportable audit trail for specific trip or date range
- For dispute resolution and financial audits

---

### **FR-9: Payment Tracking**

**FR-9.1 - Payment Recording**
- When marking trip as PAID, record:
  - Payment date
  - Payment method (mobile money, bank transfer, cash)
  - Amount paid
  - Confirmation notes/reference number

**FR-9.2 - Payment Status**
- INVOICED but not yet PAID: Tracked as outstanding
- Super Admin report: Outstanding invoices by branch/transporter

---

### **FR-10: Notifications (Phase 2)**
- SMS when invoice generated (future)
- Email when trip approved (future)
- In-app notifications for pending approvals

---

## **Non-Functional Requirements**

### **NFR-1: Performance**
- Page load < 2 seconds on 4G connection
- Search results return in < 500ms
- Dashboard load < 3 seconds
- Invoice generation < 5 seconds

### **NFR-2: Security**
- All passwords hashed with bcrypt (salt rounds: 10)
- All API calls require authentication
- HTTPS only (TLS 1.2+)
- JWT tokens signed with strong secret
- Input validation on all forms (server-side + client-side)
- SQL injection prevention (using MongoDB with Mongoose schemas)
- XSS protection on all user inputs

### **NFR-3: Reliability**
- 99% uptime target
- Database backups daily
- Error logging & monitoring (Sentry or similar)
- Graceful error handling with user-friendly messages

### **NFR-4: Scalability**
- Designed for 50-200 trucks initially, 20+ branches in future
- Database indexed on frequently queried fields (trip date, status, truck number)
- API rate limiting (prevent abuse)
- Pagination for large lists (50 trips per page default)

### **NFR-5: Usability**
- Mobile-responsive design (works on phone, tablet, desktop)
- Intuitive navigation
- Color-coded status badges (PENDING=yellow, COMPLETED=green, INVOICED=blue, PAID=checkmark)
- Dark mode support (nice-to-have)
- Tooltip help for complex fields

### **NFR-6: Compliance**
- GDPR-style data privacy (user data handling policy)
- Full audit trail for financial compliance (Congo tax law)
- Data retention policy (keep data for 7 years minimum)

---

## **User Stories**

### **User Story 1: Branch Manager Logs a Trip**

**As a** branch manager  
**I want to** quickly log a completed trip  
**So that** I don't forget details and can track fleet performance  

**Given** I'm logged in to the app and viewing my branch dashboard  
**When** I click "New Trip" button  
**Then** A form appears with fields: truck #, trailer #, loading point, offloading point, dates, transporter name, rates, diesel, mileage  

**And** I can fill in all required fields  
**And** Click "Save Trip"  
**Then** Trip is created with PENDING status  
**And** Confirmation message appears  
**And** Trip appears in my trip list  

**Acceptance Criteria:**
- All fields are required except invoice number
- Truck number format validated (alphanumeric)
- Dates cannot be in future
- Rates must be positive numbers
- Trip saved to database
- Audit log records creation

---

### **User Story 2: Branch Manager Approves Trip for Invoicing**

**As a** branch manager  
**I want to** review a completed trip and approve it for billing  
**So that** the transporter gets paid correctly and we maintain accurate records  

**Given** A trip has status COMPLETED  
**When** I view the trip detail  
**Then** I see an "Approve" button  

**And** I click "Approve"  
**Then** A confirmation modal asks "Are you sure?"  
**And** When I confirm:
  - Trip status changes to INVOICED
  - System calculates: subtotal (rate + diesel + mileage) + 5% fee = total
  - PDF invoice is generated with all details
  - Transporter name and total amount in CDF displayed on invoice
  - Invoice link appears on trip detail page
  - Audit log records approval (my name, timestamp)

**Acceptance Criteria:**
- Status transition is one-way (COMPLETED → INVOICED)
- Invoice calculation is correct: (rate + diesel + mileage) * 1.05
- PDF invoice generated server-side with formatting
- Invoice filename includes trip number and truck number
- Approval logged with user name and exact timestamp
- User cannot undo approval (must contact super admin)

---

### **User Story 3: Super Admin Views Company-Wide Dashboard**

**As a** super admin  
**I want to** see all branches' performance at a glance  
**So that** I can make strategic decisions and identify issues  

**Given** I'm logged in as Super Admin  
**When** I access the dashboard  
**Then** I see:
  - Total trips this month
  - Total revenue this month (in CDF)
  - Revenue by branch (bar chart)
  - Top transporters (trip count)
  - Pending approvals across all branches (count + details)
  - Number of branches and active users

**And** I can click on a branch to drill down into its details  
**And** I can change date range using date picker  
**And** Data updates instantly  

**Acceptance Criteria:**
- Dashboard loads in < 3 seconds
- All calculations are correct (sums, averages)
- Date range persists when drilling down
- Export to CSV button available
- No data from branches user doesn't manage visible (future multi-admin scenario)

---

### **User Story 4: Search for a Specific Trip**

**As a** branch manager  
**I want to** quickly find a trip by truck number or transporter name  
**So that** I don't have to scroll through hundreds of records  

**Given** I'm on the trips list page  
**When** I type "1093" in the search box  
**Then** Only trips with truck number containing "1093" appear  

**And** When I clear search and type "Ahmed"  
**Then** Only trips with transporter name "Ahmed" appear  

**And** Search is case-insensitive ("ahmed" = "AHMED")  

**Acceptance Criteria:**
- Search is real-time (results update as I type)
- Partial matches work (don't need full truck number)
- Search only shows my branch's trips (if branch manager)
- Results show trip summary (truck #, transporter, date, status)
- Click result to see full trip details

---

### **User Story 5: View Audit Trail for Dispute Resolution**

**As a** super admin  
**I want to** see complete history of changes to a trip  
**So that** I can resolve disputes and ensure transparency  

**Given** A transporter disputes an invoice amount  
**When** I view the trip detail and scroll to "Audit Trail"  
**Then** I see:
  - Trip created on [date] by [manager name]
  - Field "TransportationRate" changed from 100 → 150 on [date] by [manager name]
  - Status changed from PENDING → COMPLETED on [date]
  - Trip approved by [manager name] at [exact time]
  - Invoice generated at [timestamp]

**And** Each log entry shows timestamp, user, action, and details  
**And** I can export audit trail as PDF or CSV  

**Acceptance Criteria:**
- Every change is logged (no exceptions)
- Timestamp accurate to the second
- User identity clear (name + role)
- Changes show before/after values
- Audit trail cannot be edited
- Export preserves formatting

---

### **User Story 6: Record Payment Received**

**As a** branch manager  
**I want to** mark a trip as PAID after payment is received  
**So that** I know which invoices are settled and which are outstanding  

**Given** A trip is in INVOICED status  
**When** I click "Mark as Paid"  
**Then** A modal appears asking:
  - Payment Date (date picker)
  - Payment Method (dropdown: Mobile Money, Bank Transfer, Cash)
  - Confirmation Reference (text, optional)

**And** I fill in the details and click "Confirm"  
**Then** Trip status changes to PAID  
**And** Payment details stored  
**And** Audit log records payment  

**Acceptance Criteria:**
- Payment date cannot be after today
- Payment method required
- Status change to PAID is final (can view but not edit)
- Paid trips excluded from "outstanding invoices" report
- Transporter can be marked PAID without full amount received (partial payment, amount field nice-to-have)

---

### **User Story 7: Generate Weekly Branch Report**

**As a** branch manager  
**I want to** generate a report of all trips and revenue for the week  
**So that** I can send to accounting/owner and track performance  

**Given** I'm on the Reports page  
**When** I select:
  - Report Type: "Weekly Summary"
  - Date Range: Last 7 days (auto-selected)
  
**Then** Report shows:
  - Total trips: 45
  - Total revenue: 5,000,000 CDF
  - Total expenses (diesel + mileage): 1,200,000 CDF
  - Net profit: 3,800,000 CDF
  - Top transporter: John (12 trips)
  - Trips by status (breakdown)

**And** I can click "Export to CSV"  
**Then** File `Report_BranchName_2024-01-01_2024-01-07.csv` downloads  

**Acceptance Criteria:**
- Calculations include only trips in selected date range
- Export file opens correctly in Excel/Google Sheets
- Report includes all key metrics (revenue, expenses, profit, trip count)
- Date range customizable
- Report refreshes if data changes

---

## **Data Validation Rules**

| Field | Validation |
|-------|-----------|
| Truck Number | Alphanumeric, 1-20 chars, unique per branch per day |
| Trailer Number | Alphanumeric, optional |
| Loading Point | String, 1-100 chars, required |
| Offloading Point | String, 1-100 chars, required |
| Date Loaded | Date, cannot be in future, required |
| Date Offloaded | Date, cannot be before date loaded, required |
| Transporter Name | String, 1-50 chars, required |
| Invoice Number | Alphanumeric, auto-generated if empty, unique |
| Transportation Rate | Number, > 0, CDF, required |
| Diesel Per Trip | Number, >= 0, CDF, required |
| Mileage Cash | Number, >= 0, CDF, required |
| Service Fee | Auto-calculated, read-only (5% of subtotal) |
| Branch ID | Valid branch, required |
| Status | Enum: PENDING, ASSIGNED, IN_TRANSIT, COMPLETED, INVOICED, PAID |

