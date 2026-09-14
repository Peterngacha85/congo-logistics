import { useForm } from 'react-hook-form'
import Modal from '../Common/Modal'
import Button from '../Common/Button'

export default function QuickAddDriverModal({ isOpen, onClose, onCreated }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  const onSubmit = async (values) => {
    await onCreated(values)
    reset()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a New Driver">
      <p className="mb-4 text-sm text-slate-500">
        This driver will be submitted for admin approval and won't be selectable on a trip until then.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
          <input {...register('name', { required: true })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input {...register('phone')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">License Number</label>
          <input {...register('licenseNumber')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Submit for Approval
          </Button>
        </div>
      </form>
    </Modal>
  )
}
