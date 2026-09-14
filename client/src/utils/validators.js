import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
})

export const tripSchema = z
  .object({
    truckId: z.string().min(1, 'Please select a truck'),
    transporterId: z.string().min(1, 'Please select a driver'),
    trailerNumber: z.string().max(20).optional().or(z.literal('')),
    loadingPoint: z.string().min(1, 'Loading point is required').max(100),
    offloadingPoint: z.string().min(1, 'Offloading point is required').max(100),
    dateLoaded: z.string().min(1, 'Date loaded is required'),
    dateOffloaded: z.string().min(1, 'Date offloaded is required'),
    transportationRate: z.coerce.number().positive('Rate must be greater than 0'),
    dieselPerTrip: z.coerce.number().min(0, 'Diesel cost cannot be negative'),
    mileageCash: z.coerce.number().min(0, 'Mileage cannot be negative'),
    notes: z.string().optional().or(z.literal(''))
  })
  .refine((data) => new Date(data.dateLoaded) <= new Date(), {
    message: 'Date loaded cannot be in the future',
    path: ['dateLoaded']
  })
  .refine((data) => new Date(data.dateOffloaded) >= new Date(data.dateLoaded), {
    message: 'Date offloaded cannot be before date loaded',
    path: ['dateOffloaded']
  })

export const markPaidSchema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  confirmationRef: z.string().optional().or(z.literal('')),
  amountPaid: z.coerce.number().optional()
})

export const signupSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

export const managerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  branchId: z.string().min(1, 'Branch is required')
})
