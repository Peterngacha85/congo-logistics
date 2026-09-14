import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts'
import { ROLES } from '../../utils/constants'

const linkClass = ({ isActive }) =>
  `flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

function CountBadge({ count }) {
  if (!count) return null
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 px-1.5 text-xs font-semibold text-white">
      {count}
    </span>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === ROLES.SUPER_ADMIN
  const pending = useAdminPendingCounts()

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 md:block">
      <nav className="flex flex-col gap-1">
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/trips" className={linkClass}>
          Trips
        </NavLink>
        <NavLink to="/invoices" className={linkClass}>
          Invoices
        </NavLink>
        <NavLink to="/reports" className={linkClass}>
          Reports
        </NavLink>
        <NavLink to="/trucks" className={linkClass}>
          <span>Trucks</span>
          <CountBadge count={pending.trucks} />
        </NavLink>
        <NavLink to="/drivers" className={linkClass}>
          <span>Drivers</span>
          <CountBadge count={pending.transporters} />
        </NavLink>
        {isAdmin && (
          <>
            <div className="mt-4 mb-2 flex items-center gap-2 px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Administration
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <NavLink to="/admin/branches" className={linkClass}>
              Branches
            </NavLink>
            <NavLink to="/admin/users" className={linkClass}>
              <span>Users</span>
              <CountBadge count={pending.managers} />
            </NavLink>
            <NavLink to="/admin/audit-logs" className={linkClass}>
              Audit Logs
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
