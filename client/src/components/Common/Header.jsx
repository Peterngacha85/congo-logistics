import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNotification } from '../../hooks/useNotification'
import Button from './Button'

export default function Header() {
  const { user, logout } = useAuth()
  const { showNotification } = useNotification()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const redirectTo = user?.role === 'SUPER_ADMIN' ? '/admin/login' : '/login'
    await logout()
    showNotification('Logged out successfully', 'success')
    navigate(redirectTo)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Congo Logistics" className="h-8 w-auto" />
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-slate-500">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Branch Manager'}</p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  )
}
