import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { reportService } from '../../services/reportService'
import { tripService } from '../../services/tripService'
import { truckService } from '../../services/truckService'
import { transporterService } from '../../services/transporterService'
import { useNotification } from '../../hooks/useNotification'
import { formatCurrency } from '../../utils/formatters'
import { useSocketEvent } from '../../hooks/useSocket'
import { SOCKET_EVENTS } from '../../utils/constants'
import StatsCard from './StatsCard'
import LoadingSpinner from '../Common/LoadingSpinner'
import StatusBadge from '../Trips/StatusBadge'
import Button from '../Common/Button'
import Modal from '../Common/Modal'
import TripForm from '../Trips/TripForm'
import QuickAddTruckModal from '../Trips/QuickAddTruckModal'
import QuickAddDriverModal from '../Trips/QuickAddDriverModal'

export default function BranchManagerDashboard({ user }) {
  const [summary, setSummary] = useState(null)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(null) // 'truck' | 'driver' | null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotification } = useNotification()
  const navigate = useNavigate()

  const load = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)

    Promise.all([
      reportService.getBranchSummary(user.branchId, from.toISOString(), to.toISOString()),
      tripService.getTrips({ status: 'COMPLETED', limit: 5 })
    ])
      .then(([summaryRes, tripsRes]) => {
        setSummary(summaryRes.data.data)
        setPendingApprovals(tripsRes.data.data)
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => load(), [user.branchId])

  const refetchSilently = () => load(false)
  useSocketEvent(SOCKET_EVENTS.TRIP_CREATED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_STATUS_CHANGED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_INVOICED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_PAID, refetchSilently)

  const handleCreateTrip = async (values) => {
    setIsSubmitting(true)
    try {
      const { data } = await tripService.createTrip(values)
      showNotification('Trip created successfully', 'success')
      setIsCreateOpen(false)
      navigate(`/trips/${data.data._id}`)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to create trip', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTruckCreated = async (values) => {
    try {
      await truckService.createTruck(values)
      showNotification('Truck submitted - it will appear once an admin approves it', 'success')
      setQuickAddOpen(null)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add truck', 'error')
    }
  }

  const handleDriverCreated = async (values) => {
    try {
      await transporterService.createTransporter(values)
      showNotification('Driver submitted - they will appear once an admin approves them', 'success')
      setQuickAddOpen(null)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add driver', 'error')
    }
  }

  if (isLoading) return <LoadingSpinner size="lg" className="mt-16" />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user.firstName}</h1>
          <p className="text-slate-500">Last 30 days overview for your branch</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>New Trip</Button>
          <Button variant="secondary" onClick={() => setQuickAddOpen('truck')}>
            Add Truck
          </Button>
          <Button variant="secondary" onClick={() => setQuickAddOpen('driver')}>
            Add Driver
          </Button>
          <Link to="/invoices">
            <Button variant="secondary">Invoices</Button>
          </Link>
          <Link to="/reports">
            <Button variant="secondary">Reports</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Trips" value={summary?.summary.totalTrips ?? 0} />
        <StatsCard label="Revenue" value={formatCurrency(summary?.summary.totalRevenue)} accent="secondary" />
        <StatsCard label="Net Profit" value={formatCurrency(summary?.summary.netProfit)} accent="secondary" />
        <StatsCard label="Pending Approvals" value={pendingApprovals.length} accent="slate" />
      </div>

      {summary?.byStatus && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Trips by Status</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <Link
                key={status}
                to={`/trips?status=${status}`}
                className="rounded-lg bg-slate-50 p-3 text-center transition-colors hover:bg-slate-100"
              >
                <p className="text-lg font-semibold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{status.replace('_', ' ')}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Trips Awaiting Approval</h2>
          <Link to="/trips?status=COMPLETED" className="text-sm text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        {pendingApprovals.length === 0 ? (
          <p className="text-sm text-slate-500">No trips waiting for approval.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingApprovals.map((trip) => (
              <li key={trip._id} className="flex items-center justify-between py-3">
                <div>
                  <Link to={`/trips/${trip._id}`} className="font-medium text-slate-900 hover:text-primary-600">
                    {trip.tripNumber}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {trip.truckNumber} - {trip.transporterName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">{formatCurrency(trip.totalAmount)}</span>
                  <StatusBadge status={trip.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Trip">
        <TripForm onSubmit={handleCreateTrip} isSubmitting={isSubmitting} onCancel={() => setIsCreateOpen(false)} />
      </Modal>
      <QuickAddTruckModal
        isOpen={quickAddOpen === 'truck'}
        onClose={() => setQuickAddOpen(null)}
        onCreated={handleTruckCreated}
      />
      <QuickAddDriverModal
        isOpen={quickAddOpen === 'driver'}
        onClose={() => setQuickAddOpen(null)}
        onCreated={handleDriverCreated}
      />
    </div>
  )
}
