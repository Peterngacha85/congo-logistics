import { useAuth } from '../hooks/useAuth'
import { ROLES } from '../utils/constants'
import BranchManagerDashboard from '../components/Dashboard/BranchManagerDashboard'
import SuperAdminDashboard from '../components/Dashboard/SuperAdminDashboard'

export default function DashboardPage() {
  const { user } = useAuth()

  return user.role === ROLES.SUPER_ADMIN ? (
    <SuperAdminDashboard user={user} />
  ) : (
    <BranchManagerDashboard user={user} />
  )
}
