import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { markPaidSchema } from '../../utils/validators'
import { PAYMENT_METHODS } from '../../utils/constants'

export default function MarkPaidModal({ trip, isOpen, onClose, onSubmit, isSubmitting }) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: '',
      confirmationRef: '',
      amountPaid: trip?.totalAmount
    }
  })

  if (!trip) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form id="mark-paid-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Payment Date</label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            {...register('paymentDate')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.paymentDate && <p className="mt-1 text-xs text-red-600">{errors.paymentDate.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
          <select {...register('paymentMethod')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select method</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {errors.paymentMethod && <p className="mt-1 text-xs text-red-600">{errors.paymentMethod.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Confirmation Reference (optional)</label>
          <input {...register('confirmationRef')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
