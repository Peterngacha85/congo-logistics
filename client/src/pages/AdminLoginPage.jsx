import LoginForm from '../components/Auth/LoginForm'

// Reached only by navigating directly to /admin/login - intentionally not
// linked from the manager login page (see LoginPage.jsx).
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Congo Logistics" className="mx-auto mb-6 h-10 w-auto" />
        <h1 className="mb-6 text-center text-lg font-semibold text-slate-900">Super Admin Login</h1>

        <LoginForm asAdmin />
      </div>
    </div>
  )
}
