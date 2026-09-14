import { Link } from 'react-router-dom'
import LoginForm from '../components/Auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Congo Logistics" className="mx-auto mb-6 h-10 w-auto" />
        <h1 className="mb-6 text-center text-lg font-semibold text-slate-900">Branch Manager Login</h1>

        <LoginForm asAdmin={false} />

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
