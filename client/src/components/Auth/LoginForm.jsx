import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNotification } from '../../hooks/useNotification'
import { loginSchema } from '../../utils/validators'
import Button from '../Common/Button'
import PasswordInput from '../Common/PasswordInput'

export default function LoginForm({ asAdmin }) {
  const { login, error, clearError } = useAuth()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values) => {
    clearError()
    setIsSubmitting(true)
    try {
      await login(values.email, values.password, values.rememberMe, asAdmin)
      showNotification('Login successful', 'success')
      navigate('/')
    } catch {
      // error surfaced via AuthContext.error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <PasswordInput label="Password" registration={register('password')} error={errors.password} />

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" {...register('rememberMe')} className="rounded border-slate-300" />
        Remember this device
      </label>

      <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
        Log In
      </Button>
    </form>
  )
}
