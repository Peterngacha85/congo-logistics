import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { transporterService } from '../services/transporterService'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { useSocketEvent } from '../hooks/useSocket'
import { ROLES, SOCKET_EVENTS } from '../utils/constants'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import Badge from '../components/Common/Badge'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import QuickAddDriverModal from '../components/Trips/QuickAddDriverModal'

function PendingDriverRow({ driver, onApprove, onReject }) {
  const [isBusy, setIsBusy] = useState(false)

  const approve = async () => {
    setIsBusy(true)
    try {
      await onApprove(driver._id)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium text-slate-900">{driver.name}</p>
        <p className="text-sm text-slate-500">
          {driver.phone || 'No phone'} {driver.licenseNumber ? `· License: ${driver.licenseNumber}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={approve} isLoading={isBusy}>
          Approve
        </Button>
        <Button size="sm" variant="danger-outline" onClick={() => onReject(driver._id)}>
          Reject
        </Button>
      </div>
    </li>
  )
}

export default function DriversPage() {
  const { user } = useAuth()
  const isAdmin = user.role === ROLES.SUPER_ADMIN
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotification } = useNotification()

  const { register, handleSubmit, reset } = useForm()

  const fetchData = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    transporterService
      .getTransporters()
      .then(({ data }) => setDrivers(data.data))
      .catch(() => showNotification('Failed to load drivers', 'error'))
      .finally(() => setIsLoading(false))
  }

  useEffect(fetchData, [])

  const refetchSilently = () => fetchData(false)
  useSocketEvent(SOCKET_EVENTS.TRANSPORTER_REGISTERED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRANSPORTER_APPROVED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRANSPORTER_REJECTED, refetchSilently)

  const onAdminSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      await transporterService.createTransporter(values)
      showNotification('Driver added successfully', 'success')
      setIsCreateOpen(false)
      reset()
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add driver', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onManagerSubmit = async (values) => {
    try {
      await transporterService.createTransporter(values)
      showNotification('Driver submitted - they will appear here once an admin approves them', 'success')
      setIsCreateOpen(false)
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add driver', 'error')
    }
  }

  const handleApprove = async (transporterId) => {
    try {
      await transporterService.approveTransporter(transporterId)
      showNotification('Driver approved', 'success')
      fetchData(false)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to approve driver', 'error')
    }
  }

  const handleReject = async (transporterId) => {
    if (!window.confirm('Reject and delete this driver submission?')) return
    try {
      await transporterService.deleteTransporter(transporterId)
      showNotification('Driver rejected', 'success')
      fetchData(false)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to reject driver', 'error')
    }
  }

  const handleDelete = async (transporterId) => {
    if (!window.confirm('Delete this driver?')) return
    try {
      await transporterService.deleteTransporter(transporterId)
      showNotification('Driver deleted', 'success')
      fetchData(false)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to delete driver', 'error')
    }
  }

  const pending = drivers.filter((d) => d.approvalStatus === 'PENDING_APPROVAL')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Drivers</h1>
        <Button onClick={() => setIsCreateOpen(true)}>Add Driver</Button>
      </div>

      {isAdmin && pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-2 font-semibold text-amber-900">Pending Approvals ({pending.length})</h2>
          <ul className="divide-y divide-amber-200">
            {pending.map((d) => (
              <PendingDriverRow key={d._id} driver={d} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : drivers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No drivers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">License #</th>
                <th className="px-4 py-3 font-medium">Approval</th>
                {isAdmin && <th className="px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d) => (
                <tr key={d._id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3">{d.phone || '-'}</td>
                  <td className="px-4 py-3">{d.licenseNumber || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        d.approvalStatus === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }
                    >
                      {d.approvalStatus === 'PENDING_APPROVAL' ? 'Pending Approval' : 'Approved'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="danger-outline" onClick={() => handleDelete(d._id)}>
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin ? (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Driver">
          <form onSubmit={handleSubmit(onAdminSubmit)} className="flex flex-col gap-4">
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
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Add Driver
              </Button>
            </div>
          </form>
        </Modal>
      ) : (
        <QuickAddDriverModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={onManagerSubmit} />
      )}
    </div>
  )
}
