import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authService } from '../services/authService'
import { signupSchema } from '../utils/validators'
import Button from '../components/Common/Button'
import PasswordInput from '../components/Common/PasswordInput'

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (values) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      await authService.signup(values)
      setIsSubmitted(true)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Congo Logistics" className="mx-auto mb-6 h-10 w-auto" />

        {isSubmitted ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-lg font-semibold text-slate-900">Registration submitted</h1>
            <p className="text-sm text-slate-500">
              An admin will review your account and assign you to a branch. You'll be able to log in once approved.
            </p>
            <Link to="/login" className="text-primary-600 hover:underline text-sm font-medium">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-6 text-center text-lg font-semibold text-slate-900">Branch Manager Registration</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {serverError && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
                  <input {...register('firstName')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
                  <input {...register('lastName')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" autoComplete="email" {...register('email')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone (optional)</label>
                <input {...register('phone')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <PasswordInput
                label="Password"
                registration={register('password')}
                error={errors.password}
                autoComplete="new-password"
              />
              <PasswordInput
                label="Confirm Password"
                registration={register('confirmPassword')}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
                Register
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
