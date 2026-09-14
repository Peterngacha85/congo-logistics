import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { truckService } from '../services/truckService'
import { branchService } from '../services/branchService'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { useSocketEvent } from '../hooks/useSocket'
import { ROLES, SOCKET_EVENTS } from '../utils/constants'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import Badge from '../components/Common/Badge'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import QuickAddTruckModal from '../components/Trips/QuickAddTruckModal'

function PendingTruckRow({ truck, onApprove, onReject }) {
  const [isBusy, setIsBusy] = useState(false)

  const approve = async () => {
    setIsBusy(true)
    try {
      await onApprove(truck._id)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium text-slate-900">{truck.truckNumber}</p>
        <p className="text-sm text-slate-500">{truck.trailerNumber || 'No trailer specified'}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={approve} isLoading={isBusy}>
          Approve
        </Button>
        <Button size="sm" variant="danger-outline" onClick={() => onReject(truck._id)}>
          Reject
        </Button>
      </div>
    </li>
  )
}

export default function TrucksPage() {
  const { user } = useAuth()
  const isAdmin = user.role === ROLES.SUPER_ADMIN
  const [trucks, setTrucks] = useState([])
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotification } = useNotification()

  const { register, handleSubmit, reset } = useForm()

  const fetchData = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    Promise.all([truckService.getTrucks(), isAdmin ? branchService.getBranches() : Promise.resolve({ data: { data: [] } })])
      .then(([trucksRes, branchesRes]) => {
        setTrucks(trucksRes.data.data)
        setBranches(branchesRes.data.data)
      })
      .catch(() => showNotification('Failed to load trucks', 'error'))
      .finally(() => setIsLoading(false))
  }

  useEffect(fetchData, [])

  const refetchSilently = () => fetchData(false)
  useSocketEvent(SOCKET_EVENTS.TRUCK_REGISTERED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRUCK_APPROVED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRUCK_REJECTED, refetchSilently)

  const onAdminSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      await truckService.createTruck(values)
      showNotification('Truck added successfully', 'success')
      setIsCreateOpen(false)
      reset()
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add truck', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onManagerSubmit = async (values) => {
    try {
      await truckService.createTruck(values)
      showNotification('Truck submitted - it will appear here once an admin approves it', 'success')
      setIsCreateOpen(false)
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add truck', 'error')
    }
  }

  const handleApprove = async (truckId) => {
    try {
      await truckService.approveTruck(truckId)
      showNotification('Truck approved', 'success')
      fetchData(false)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to approve truck', 'error')
    }
  }

  const handleReject = async (truckId) => {
    if (!window.confirm('Reject and delete this truck submission?')) return
    try {
      await truckService.deleteTruck(truckId)
      showNotification('Truck rejected', 'success')
      fetchData(false)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to reject truck', 'error')
    }
  }

  const handleDelete = async (truckId) => {
    if (!window.confirm('Delete this truck?')) return
    try {
      await truckService.deleteTruck(truckId)
      showNotification('Truck deleted', 'success')
      fetchData(false)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to delete truck', 'error')
    }
  }

  const pending = trucks.filter((t) => t.approvalStatus === 'PENDING_APPROVAL')
  const branchName = (id) => branches.find((b) => b._id === id)?.branchName || 'Company-wide'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Trucks</h1>
        <Button onClick={() => setIsCreateOpen(true)}>Add Truck</Button>
      </div>

      {isAdmin && pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-2 font-semibold text-amber-900">Pending Approvals ({pending.length})</h2>
          <ul className="divide-y divide-amber-200">
            {pending.map((t) => (
              <PendingTruckRow key={t._id} truck={t} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : trucks.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No trucks yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Truck #</th>
                <th className="px-4 py-3 font-medium">Trailer</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Branch</th>}
                <th className="px-4 py-3 font-medium">Approval</th>
                {isAdmin && <th className="px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trucks.map((t) => (
                <tr key={t._id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.truckNumber}</td>
                  <td className="px-4 py-3">{t.trailerNumber || '-'}</td>
                  {isAdmin && <td className="px-4 py-3">{branchName(t.branchId)}</td>}
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        t.approvalStatus === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }
                    >
                      {t.approvalStatus === 'PENDING_APPROVAL' ? 'Pending Approval' : 'Approved'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="danger-outline" onClick={() => handleDelete(t._id)}>
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
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Truck">
          <form onSubmit={handleSubmit(onAdminSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Truck Number</label>
              <input {...register('truckNumber', { required: true })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Trailer Number (optional)</label>
              <input {...register('trailerNumber')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Make</label>
                <input {...register('make')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Model</label>
                <input {...register('model')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">License Plate</label>
              <input {...register('licensePlate')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch (optional - leave blank for company-wide)</label>
              <select {...register('branchId')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Company-wide</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Add Truck
              </Button>
            </div>
          </form>
        </Modal>
      ) : (
        <QuickAddTruckModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={onManagerSubmit} />
      )}
    </div>
  )
}
