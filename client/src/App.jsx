import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { SocketProvider } from './context/SocketContext'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'
import ErrorBoundary from './components/Common/ErrorBoundary'
import Layout from './components/Common/Layout'
import { ROLES } from './utils/constants'

import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TripsPage from './pages/TripsPage'
import TripDetailPage from './pages/TripDetailPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import ReportsPage from './pages/ReportsPage'
import TrucksPage from './pages/TrucksPage'
import DriversPage from './pages/DriversPage'
import AdminBranchesPage from './pages/AdminBranchesPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminAuditLogsPage from './pages/AdminAuditLogsPage'
import NotFoundPage from './pages/NotFoundPage'
import UnauthorizedPage from './pages/UnauthorizedPage'

function withLayout(children) {
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                <Route path="/" element={<ProtectedRoute>{withLayout(<DashboardPage />)}</ProtectedRoute>} />
                <Route path="/trips" element={<ProtectedRoute>{withLayout(<TripsPage />)}</ProtectedRoute>} />
                <Route
                  path="/trips/:tripId"
                  element={<ProtectedRoute>{withLayout(<TripDetailPage />)}</ProtectedRoute>}
                />
                <Route
                  path="/invoices"
                  element={<ProtectedRoute>{withLayout(<InvoicesPage />)}</ProtectedRoute>}
                />
                <Route
                  path="/invoices/:invoiceId"
                  element={<ProtectedRoute>{withLayout(<InvoiceDetailPage />)}</ProtectedRoute>}
                />
                <Route
                  path="/reports"
                  element={<ProtectedRoute>{withLayout(<ReportsPage />)}</ProtectedRoute>}
                />
                <Route path="/trucks" element={<ProtectedRoute>{withLayout(<TrucksPage />)}</ProtectedRoute>} />
                <Route path="/drivers" element={<ProtectedRoute>{withLayout(<DriversPage />)}</ProtectedRoute>} />

                <Route
                  path="/admin/branches"
                  element={
                    <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                      {withLayout(<AdminBranchesPage />)}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                      {withLayout(<AdminUsersPage />)}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                      {withLayout(<AdminAuditLogsPage />)}
                    </ProtectedRoute>
                  }
                />

                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  )
}
