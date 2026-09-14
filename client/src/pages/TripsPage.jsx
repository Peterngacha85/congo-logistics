import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { tripService } from '../services/tripService'
import { useNotification } from '../hooks/useNotification'
import { useSocketEvent } from '../hooks/useSocket'
import { formatCurrency, formatDate } from '../utils/formatters'
import { TRIP_STATUS_LIST, SOCKET_EVENTS } from '../utils/constants'
import StatusBadge from '../components/Trips/StatusBadge'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import TripForm from '../components/Trips/TripForm'
import LoadingSpinner from '../components/Common/LoadingSpinner'

export default function TripsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [trips, setTrips] = useState([])
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotification } = useNotification()

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = Number(searchParams.get('page') || 1)

  const fetchTrips = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    tripService
      .getTrips({ search: search || undefined, status: status || undefined, page, limit: 20 })
      .then(({ data }) => {
        setTrips(data.data)
        setPagination(data.pagination)
      })
      .catch(() => showNotification('Failed to load trips', 'error'))
      .finally(() => setIsLoading(false))
  }

  useEffect(fetchTrips, [search, status, page])

  // Trip lifecycle events are room-scoped server-side (admins + the owning
  // branch), so a manager only ever hears about their own branch's trips.
  const refetchSilently = () => fetchTrips(false)
  useSocketEvent(SOCKET_EVENTS.TRIP_CREATED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_UPDATED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_STATUS_CHANGED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_INVOICED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_PAID, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_DELETED, refetchSilently)

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  const handleCreate = async (values) => {
    setIsSubmitting(true)
    try {
      await tripService.createTrip(values)
      showNotification('Trip created successfully', 'success')
      setIsCreateOpen(false)
      fetchTrips()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to create trip', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Trips</h1>
        <Button onClick={() => setIsCreateOpen(true)}>New Trip</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search truck number or transporter..."
          defaultValue={search}
          onChange={(e) => updateParam('search', e.target.value)}
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {TRIP_STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : trips.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No trips found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Trip #</th>
                <th className="px-4 py-3 font-medium">Truck</th>
                <th className="px-4 py-3 font-medium">Transporter</th>
                <th className="px-4 py-3 font-medium">Loaded</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map((trip) => (
                <tr key={trip._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/trips/${trip._id}`} className="font-medium text-primary-700 hover:underline">
                      {trip.tripNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{trip.truckNumber}</td>
                  <td className="px-4 py-3">{trip.transporterName}</td>
                  <td className="px-4 py-3">{formatDate(trip.dateLoaded)}</td>
                  <td className="px-4 py-3">{formatCurrency(trip.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={trip.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/trips/${trip._id}`}>
                      <Button variant="secondary" size="sm">
                        View Trip
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} trips)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!pagination.hasPrevPage}
              onClick={() => updateParam('page', String(page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!pagination.hasNextPage}
              onClick={() => updateParam('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Trip">
        <TripForm onSubmit={handleCreate} isSubmitting={isSubmitting} onCancel={() => setIsCreateOpen(false)} />
      </Modal>
    </div>
  )
}
