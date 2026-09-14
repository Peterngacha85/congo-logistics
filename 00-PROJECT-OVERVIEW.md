# Congo Logistics Platform - Project Overview

**Project Name:** Congo Logistics Management System  
**Client:** Logistics Company (Congo-based multi-branch operation)  
**Technology Stack:** MERN (MongoDB, Express, React, Node.js)  
**Architecture Pattern:** MVC with Component-Based Architecture  
**Status:** Brainstorming & Requirements Gathering  

---

## **Project Goal**

Digitize logistics operations for a Congo-based transportation company by replacing **manual paper record-keeping** with a centralized digital platform that enables:
- Multi-branch trip tracking and management
- Automated invoicing and billing
- Real-time financial visibility
- Complete audit trail for compliance
- Future-ready for GPS tracking integration (Navi Africa Telematics)

---

## **Core Data Model**

The application tracks **trips** as the central business entity:

```
Trip = {
  truckNumber,        // e.g., 1093AX05
  trailerNumber,
  loadingPoint,
  offloadingPoint,
  dateLoaded,
  dateOffloaded,
  transporterName,
  invoiceNumber,
  transportationRate, // primary cost
  dieselPerTrip,      // fuel cost
  mileageCash,        // mileage allowance
  serviceFee,         // 5% on total
  status,             // Pending → Assigned → In Transit → Completed → Invoiced → Paid
  branchId,           // which branch owns this trip
  approvedBy,         // manager who approved
  invoiceGeneratedAt, // auto-generated timestamp
  auditLog            // all changes tracked
}
```

---

## **Key Stakeholders & Roles**

1. **Super Admin**
   - Views all branches and all trips
   - Generates company-wide reports
   - Manages branch managers and system configuration
   - Full audit trail access

2. **Branch Manager**
   - Manages trucks and transporters for their branch only
   - Logs trips, verifies completion
   - Approves trips for invoicing
   - Generates PDF invoices
   - Views branch-specific reports

3. **Transporter** (Future)
   - Will log own trips (phase 2)
   - Currently data entered by branch manager

---

## **Current Business Flow**

### Manual Process (Now)
```
Transporter completes trip
    ↓
Writes details on paper
    ↓
Branch manager enters into spreadsheet/records
    ↓
Manual invoice calculation
    ↓
Payment via mobile money/bank
    ↓
Lost tracking of payment status
```

### Digital Process (After)
```
Branch manager logs trip details in app
    ↓
Marks trip as completed
    ↓
Reviews trip data
    ↓
Clicks "Approve" → App auto-calculates all fees
    ↓
App generates PDF invoice
    ↓
Sends to transporter
    ↓
Tracks payment status & completion
    ↓
All data searchable, reportable, auditable
```

---

## **Operational Scope**

| Aspect | Details |
|--------|---------|
| **Trucks** | 50-200 vehicles (scalable) |
| **Branches** | Currently 2-3, planning 20+ |
| **Users** | ~50-100 (branch managers + super admin) |
| **Currency** | Congo Francs (CDF) |
| **Internet** | Reliable (minimal downtime) |
| **Payment Methods** | Mobile money, bank transfers, cash |
| **Compliance** | Full audit trail required |

---

## **Trip Lifecycle & Statuses**

```
[Pending]
  ↓
[Assigned] → Branch manager assigns truck
  ↓
[In Transit] → Marked as loaded & en route
  ↓
[Completed] → Truck has offloaded, data confirmed
  ↓
[Invoiced] → Branch manager approved → PDF invoice generated
  ↓
[Paid] → Payment received & marked complete
```

---

## **Key Features**

### MVP (Phase 1)
- ✅ Multi-branch support with role-based access
- ✅ Trip CRUD (Create, Read, Update, Delete)
- ✅ Trip status management
- ✅ Automatic invoice calculation (rate + diesel + mileage + 5% fee)
- ✅ PDF invoice generation
- ✅ Complete audit trail
- ✅ Branch-level reporting (revenue, trips, performance)
- ✅ Company-wide reporting for Super Admin
- ✅ Text search (truck number, transporter name)
- ✅ Responsive web design (desktop & mobile-friendly)

### Phase 2 (Future)
- 🔲 GPS tracking integration (Navi Africa Telematics API)
- 🔲 Transporter mobile app
- 🔲 SMS notifications
- 🔲 Payment integration (mobile money API)
- 🔲 Advanced analytics & KPIs

---

## **Technical Decisions**

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18+ | Component reusability, state management, responsive design |
| **Backend** | Node.js + Express | Fast, scalable, real-time capable (future WebSocket tracking) |
| **Database** | MongoDB | Flexible schema for audit logs, trip variants, scalable |
| **Authentication** | JWT + bcrypt | Stateless, secure, role-based access control |
| **File Generation** | PDFKit / Puppeteer | Server-side PDF invoices with formatting |
| **Hosting** | TBD | Likely AWS/DigitalOcean for Congo accessibility |

---

## **Project Structure** (Frontend)

```
client/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── Trips/
│   │   │   ├── TripList.jsx
│   │   │   ├── TripForm.jsx
│   │   │   ├── TripDetail.jsx
│   │   │   └── TripApproval.jsx
│   │   ├── Invoices/
│   │   ├── Reports/
│   │   ├── Auth/
│   │   └── Common/
│   ├── pages/
│   ├── services/ (API calls)
│   ├── context/ (State management)
│   ├── utils/
│   └── styles/
└── package.json
```

---

## **Project Structure** (Backend)

```
server/
├── models/
│   ├── Trip.js
│   ├── Truck.js
│   ├── Transporter.js
│   ├── User.js
│   ├── Invoice.js
│   ├── AuditLog.js
│   └── Branch.js
├── routes/
│   ├── trips.js
│   ├── invoices.js
│   ├── reports.js
│   ├── auth.js
│   ├── users.js
│   └── admin.js
├── controllers/
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── services/
│   ├── invoiceService.js
│   ├── auditService.js
│   └── reportService.js
├── config/
├── utils/
└── server.js
```

---

## **Design Reference**

**Color Scheme:** Teal + Coral + Sand (professional, energetic)
- Primary: Teal (#0F766E)
- Secondary: Coral (#FF7F50)
- Accent: Sand (#F5E6CA)

**UI Pattern:** Modern dashboard with intuitive navigation, clear data tables, action buttons, status badges

---

## **Next Steps**

1. ✅ Define requirements (DONE - see 01-REQUIREMENTS.md)
2. ✅ Database schema (DONE - see 02-DATABASE-SCHEMA.md)
3. ✅ API endpoints (DONE - see 03-API-ENDPOINTS.md)
4. ⏭ Create project repository
5. ⏭ Set up authentication & user management
6. ⏭ Build trip management features
7. ⏭ Implement invoice generation
8. ⏭ Build reporting dashboard
9. ⏭ Testing & QA
10. ⏭ Deployment & launch

---

## **Notes**

- GPS tracking will be added later once Navi Africa Telematics API is secured
- Currently no driver/transporter portal; all data entered by branch managers
- All amounts in Congo Francs (CDF)
- System designed to scale from ~50 trucks to 200+ with 20+ branches
