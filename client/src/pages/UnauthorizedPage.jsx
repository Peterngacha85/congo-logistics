import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
      <p className="text-slate-500">You don't have permission to view this page.</p>
      <Link to="/" className="text-primary-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  )
}
