# Frontend Architecture & Component Structure

**Framework:** React 18+  
**Pattern:** MVC with Component-Based Architecture  
**State Management:** Context API + Custom Hooks  
**Styling:** Tailwind CSS + custom CSS for design system  
**Routing:** React Router v6  
**HTTP Client:** Axios  
**Form Handling:** React Hook Form + Zod validation  

---

## **Directory Structure**

```
client/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Common/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── Auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RoleBasedAccess.jsx
│   │   ├── Trips/
│   │   │   ├── TripList.jsx
│   │   │   ├── TripCard.jsx
│   │   │   ├── TripForm.jsx
│   │   │   ├── TripDetail.jsx
│   │   │   ├── TripActions.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── TripApprovalModal.jsx
│   │   ├── Invoices/
│   │   │   ├── InvoiceList.jsx
│   │   │   ├── InvoicePreview.jsx
│   │   │   └── InvoiceDownload.jsx
│   │   ├── Reports/
│   │   │   ├── BranchSummary.jsx
│   │   │   ├── CompanyOverview.jsx
│   │   │   ├── OutstandingInvoices.jsx
│   │   │   ├── ReportExport.jsx
│   │   │   └── Charts.jsx
│   │   ├── AuditTrail/
│   │   │   └── AuditLog.jsx
│   │   └── Dashboard/
│   │       ├── BranchManagerDashboard.jsx
│   │       ├── SuperAdminDashboard.jsx
│   │       ├── StatsCard.jsx
│   │       └── QuickActions.jsx
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TripsPage.jsx
│   │   ├── TripDetailPage.jsx
│   │   ├── InvoicesPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── NotFoundPage.jsx
│   │   └── ErrorPage.jsx
│   │
│   ├── context/
│   │   ├── AuthContext.jsx          // User & authentication
│   │   ├── TripsContext.jsx         // Trip data & operations
│   │   ├── NotificationContext.jsx  // Toast/alerts
│   │   └── FilterContext.jsx        // Search & filter state
│   │
│   ├── hooks/
│   │   ├── useAuth.js              // Access auth context
│   │   ├── useTrips.js             // Access trips context
│   │   ├── useFetch.js             // Generic data fetching
│   │   ├── useForm.js              // Form state management
│   │   ├── useNotification.js       // Toast notifications
│   │   └── useLocalStorage.js       // Persistent state
│   │
│   ├── services/
│   │   ├── api.js                  // Axios instance with interceptors
│   │   ├── authService.js          // Login, logout, refresh token
│   │   ├── tripService.js          // Trip CRUD operations
│   │   ├── invoiceService.js       // Invoice operations
│   │   ├── reportService.js        // Report generation
│   │   └── auditService.js         // Audit log queries
│   │
│   ├── utils/
│   │   ├── constants.js            // Enums, status codes
│   │   ├── formatters.js           // Date, currency formatting
│   │   ├── validators.js           // Input validation rules
│   │   ├── errorHandler.js         // Error message parsing
│   │   └── helpers.js              // Utility functions
│   │
│   ├── styles/
│   │   ├── index.css               // Global styles
│   │   ├── tailwind.config.js       // Tailwind config (design tokens)
│   │   ├── colors.css              // Color scheme (Teal, Coral, Sand)
│   │   └── animations.css          // Transitions & animations
│   │
│   ├── App.jsx                     // Main app component
│   ├── App.css
│   └── index.js                    // Entry point
│
├── package.json
├── .env.example
└── README.md
```

---

## **Core Components**

### **1. AuthContext.jsx**

Manages authentication state and user info.

```javascript
// State
{
  user: {
    _id: "ObjectId",
    firstName: "John",
    email: "john@company.com",
    role: "BRANCH_MANAGER",
    branchId: "ObjectId"
  },
  token: "JWT token string",
  refreshToken: "refresh token string",
  isAuthenticated: boolean,
  isLoading: boolean,
  error: null
}

// Actions
- login(email, password)
- logout()
- refreshToken()
- updateUserInfo()
- clearError()
```

**Usage:**
```javascript
const { user, token, isAuthenticated, login, logout } = useAuth()

if (!isAuthenticated) return <LoginPage />
return <Dashboard user={user} />
```

---

### **2. TripsContext.jsx**

Manages trips data and CRUD operations.

```javascript
// State
{
  trips: [{ _id, tripNumber, status, totalAmount, ... }],
  selectedTrip: { ... full trip object ... },
  filters: {
    status: [],
    dateRange: { from, to },
    search: "",
    page: 1,
    limit: 50
  },
  isLoading: boolean,
  error: null,
  pagination: { totalPages, totalRecords }
}

// Actions
- fetchTrips(filters)
- fetchTripById(tripId)
- createTrip(tripData)
- updateTrip(tripId, updates)
- deleteTrip(tripId)
- approveTrip(tripId)
- markAsPaid(tripId, paymentData)
- setFilters(filters)
```

**Usage:**
```javascript
const { trips, filters, fetchTrips, setFilters } = useTrips()

useEffect(() => {
  fetchTrips(filters)
}, [filters])

return (
  <TripList 
    trips={trips} 
    onFilter={setFilters}
  />
)
```

---

### **3. ProtectedRoute.jsx**

Guards routes that require authentication.

```javascript
export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />
  }
  
  return children
}

// Usage
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  } />
  <Route path="/admin" element={
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <AdminPage />
    </ProtectedRoute>
  } />
</Routes>
```

---

### **4. TripForm.jsx**

Reusable form for creating/editing trips.

```javascript
const TripForm = ({ trip = null, onSubmit, isLoading = false }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: trip || defaultTripValues
  })
  
  const rates = watch(['transportationRate', 'dieselPerTrip', 'mileageCash'])
  
  // Auto-calculate service fee (5%)
  const subtotal = rates.reduce((a, b) => a + b, 0)
  const serviceFee = subtotal * 0.05
  const total = subtotal + serviceFee
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('truckNumber')} />
      <input {...register('transportationRate', { valueAsNumber: true })} />
      <input {...register('dieselPerTrip', { valueAsNumber: true })} />
      <input {...register('mileageCash', { valueAsNumber: true })} />
      
      {/* Display calculated totals */}
      <div>
        <p>Subtotal: {formatCurrency(subtotal)}</p>
        <p>Service Fee (5%): {formatCurrency(serviceFee)}</p>
        <p>Total: {formatCurrency(total)}</p>
      </div>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Trip'}
      </button>
    </form>
  )
}
```

---

### **5. TripDetail.jsx**

Display full trip info with audit trail.

```javascript
const TripDetail = ({ tripId }) => {
  const { selectedTrip, fetchTripById, approveTrip } = useTrips()
  const [auditLogs, setAuditLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    fetchTripById(tripId)
    // Fetch audit logs
    auditService.getTripAuditTrail(tripId)
      .then(setAuditLogs)
      .finally(() => setIsLoading(false))
  }, [tripId])
  
  if (isLoading) return <LoadingSpinner />
  if (!selectedTrip) return <div>Trip not found</div>
  
  return (
    <div>
      {/* Trip Details Section */}
      <section>
        <h2>{selectedTrip.tripNumber}</h2>
        <div className="grid">
          <div><strong>Truck:</strong> {selectedTrip.truckNumber}</div>
          <div><strong>Status:</strong> <StatusBadge status={selectedTrip.status} /></div>
          <div><strong>Loading:</strong> {selectedTrip.loadingPoint}</div>
          <div><strong>Offloading:</strong> {selectedTrip.offloadingPoint}</div>
          <div><strong>Transporter:</strong> {selectedTrip.transporterName}</div>
        </div>
        
        {/* Financial Summary */}
        <div className="financial-summary">
          <div>Transportation Rate: {formatCurrency(selectedTrip.transportationRate)}</div>
          <div>Diesel: {formatCurrency(selectedTrip.dieselPerTrip)}</div>
          <div>Mileage: {formatCurrency(selectedTrip.mileageCash)}</div>
          <hr />
          <div>Service Fee (5%): {formatCurrency(selectedTrip.serviceFee)}</div>
          <strong>Total: {formatCurrency(selectedTrip.totalAmount)}</strong>
        </div>
        
        {/* Actions */}
        {selectedTrip.status === 'COMPLETED' && (
          <button onClick={() => approveTrip(tripId)}>
            Approve & Generate Invoice
          </button>
        )}
      </section>
      
      {/* Audit Trail Section */}
      <section>
        <h3>Change History</h3>
        <AuditLog entries={auditLogs} />
      </section>
    </div>
  )
}
```

---

### **6. StatusBadge.jsx**

Color-coded status display.

```javascript
const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    IN_TRANSIT: "bg-blue-200 text-blue-900",
    COMPLETED: "bg-green-100 text-green-800",
    INVOICED: "bg-purple-100 text-purple-800",
    PAID: "bg-green-200 text-green-900"
  }
  
  return (
    <span className={`badge ${colors[status]}`}>
      {status}
    </span>
  )
}
```

---

### **7. ReportsPage.jsx**

Report generation and export.

```javascript
const ReportsPage = () => {
  const { user } = useAuth()
  const [reportType, setReportType] = useState('branch-summary')
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [reportData, setReportData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      if (reportType === 'branch-summary') {
        const data = await reportService.getBranchSummary(
          user.branchId,
          dateRange.from,
          dateRange.to
        )
        setReportData(data)
      } else if (reportType === 'company' && user.role === 'SUPER_ADMIN') {
        const data = await reportService.getCompanyOverview(
          dateRange.from,
          dateRange.to
        )
        setReportData(data)
      }
    } catch (error) {
      showNotification('Failed to generate report', 'error')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleExportCSV = () => {
    reportService.exportReportCSV(reportData, reportType)
  }
  
  return (
    <div>
      <h1>Reports</h1>
      
      {/* Filters */}
      <div className="filters">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="branch-summary">Branch Summary</option>
          {user.role === 'SUPER_ADMIN' && (
            <option value="company">Company Overview</option>
          )}
        </select>
        
        <input 
          type="date" 
          value={formatISO(dateRange.from).split('T')[0]}
          onChange={(e) => setDateRange({ ...dateRange, from: parseISO(e.target.value) })}
        />
        <input 
          type="date" 
          value={formatISO(dateRange.to).split('T')[0]}
          onChange={(e) => setDateRange({ ...dateRange, to: parseISO(e.target.value) })}
        />
        
        <button onClick={handleGenerateReport} disabled={isGenerating}>
          Generate Report
        </button>
        {reportData && (
          <button onClick={handleExportCSV} variant="secondary">
            Export CSV
          </button>
        )}
      </div>
      
      {/* Report Display */}
      {reportData && (
        <div className="report">
          <BranchSummary data={reportData} />
        </div>
      )}
    </div>
  )
}
```

---

## **Service Layer (API Communication)**

### **api.js** - Axios Configuration

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'
})

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/refresh`,
          { refreshToken }
        )
        localStorage.setItem('auth_token', data.token)
        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return api(originalRequest)
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
```

### **tripService.js** - Trip Operations

```javascript
import api from './api'

export const tripService = {
  // List trips
  getTrips: (filters = {}) => {
    return api.get('/trips', { params: filters })
  },
  
  // Get single trip
  getTripById: (tripId) => {
    return api.get(`/trips/${tripId}`)
  },
  
  // Create trip
  createTrip: (tripData) => {
    return api.post('/trips', tripData)
  },
  
  // Update trip
  updateTrip: (tripId, updates) => {
    return api.put(`/trips/${tripId}`, updates)
  },
  
  // Delete trip
  deleteTrip: (tripId) => {
    return api.delete(`/trips/${tripId}`)
  },
  
  // Approve and invoice
  approveTrip: (tripId) => {
    return api.put(`/trips/${tripId}/approve`)
  },
  
  // Mark as paid
  markAsPaid: (tripId, paymentData) => {
    return api.put(`/trips/${tripId}/mark-paid`, paymentData)
  }
}
```

---

## **State Management Flow**

```
User Action (e.g., "Create Trip")
     ↓
Component (TripForm) captures input
     ↓
Calls tripService.createTrip(data)
     ↓
Service calls API via api.js
     ↓
Backend processes request
     ↓
API returns response
     ↓
TripsContext updates state
     ↓
Component re-renders with new data
     ↓
Toast notification shown to user
```

---

## **Form Validation Example**

Using React Hook Form + Zod:

```javascript
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const tripSchema = z.object({
  truckNumber: z.string().min(1, 'Truck number required'),
  transportationRate: z.number().min(1, 'Rate must be positive'),
  dieselPerTrip: z.number().min(0, 'Diesel cost cannot be negative'),
  mileageCash: z.number().min(0, 'Mileage cannot be negative'),
  dateLoaded: z.string().datetime('Invalid date'),
  dateOffloaded: z.string().datetime('Invalid date')
})

export const TripForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: zodResolver(tripSchema)
  })
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('truckNumber')} />
      {errors.truckNumber && <span>{errors.truckNumber.message}</span>}
      
      <input {...register('transportationRate', { valueAsNumber: true })} />
      {errors.transportationRate && <span>{errors.transportationRate.message}</span>}
      
      <button type="submit">Save</button>
    </form>
  )
}
```

---

## **Routing Structure**

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Trips */}
        <Route
          path="/trips"
          element={
            <ProtectedRoute>
              <Layout>
                <TripsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/trips/:tripId"
          element={
            <ProtectedRoute>
              <Layout>
                <TripDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Admin Panel (Super Admin Only) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="SUPER_ADMIN">
              <Layout>
                <AdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## **Design System / Tailwind Config**

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f8',
          600: '#0F766E',  // Teal
          700: '#0d5f5a',
          800: '#0a4a47'
        },
        secondary: {
          400: '#FF7F50', // Coral
          500: '#ff6c35',
          600: '#e65620'
        },
        accent: {
          100: '#F5E6CA', // Sand
          200: '#f0dab3'
        },
        status: {
          pending: '#FCD34D',    // Yellow
          assigned: '#3B82F6',    // Blue
          transit: '#60A5FA',     // Light Blue
          completed: '#10B981',   // Green
          invoiced: '#A78BFA',    // Purple
          paid: '#34D399'         // Green-bright
        }
      }
    }
  }
}
```

---

## **Performance Optimization**

### **Code Splitting**
```javascript
import { lazy, Suspense } from 'react'

const TripsPage = lazy(() => import('./pages/TripsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))

// Usage
<Suspense fallback={<LoadingSpinner />}>
  <TripsPage />
</Suspense>
```

### **Memoization**
```javascript
export const TripCard = memo(({ trip, onSelect }) => {
  return <div onClick={() => onSelect(trip._id)}>{trip.tripNumber}</div>
})
```

### **useMemo for Calculations**
```javascript
const totalRevenue = useMemo(
  () => trips.reduce((sum, trip) => sum + trip.totalAmount, 0),
  [trips]
)
```

