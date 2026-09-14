import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { tripService } from '../services/tripService'
import { auditService } from '../services/auditService'
import { useNotification } from '../hooks/useNotification'
import { useSocketEvent } from '../hooks/useSocket'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters'
import { NEXT_STATUS, NEXT_STATUS_LABEL, SOCKET_EVENTS } from '../utils/constants'
import StatusBadge from '../components/Trips/StatusBadge'
import TripApprovalModal from '../components/Trips/TripApprovalModal'
import MarkPaidModal from '../components/Trips/MarkPaidModal'
import TripForm from '../components/Trips/TripForm'
import AuditLog from '../components/AuditTrail/AuditLog'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import LoadingSpinner from '../components/Common/LoadingSpinner'

export default function TripDetailPage() {
  const { tripId } = useParams()
  const { showNotification } = useNotification()
  const navigate = useNavigate()

  const [trip, setTrip] = useState(null)
  const [auditEntries, setAuditEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [modal, setModal] = useState(null) // 'approve' | 'markPaid' | 'edit'

  const load = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    Promise.all([tripService.getTripById(tripId), auditService.getTripAuditTrail(tripId)])
      .then(([tripRes, auditRes]) => {
        setTrip(tripRes.data.data)
        setAuditEntries(auditRes.data.data)
      })
      .catch(() => showNotification('Failed to load trip', 'error'))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [tripId])

  // Refresh live if this exact trip changes elsewhere (another manager tab,
  // or an admin correcting it) - ignore events for other trips.
  const refetchIfThisTrip = (payload) => {
    if (payload?.tripId === tripId) load(false)
  }
  useSocketEvent(SOCKET_EVENTS.TRIP_UPDATED, refetchIfThisTrip)
  useSocketEvent(SOCKET_EVENTS.TRIP_STATUS_CHANGED, refetchIfThisTrip)
  useSocketEvent(SOCKET_EVENTS.TRIP_INVOICED, refetchIfThisTrip)
  useSocketEvent(SOCKET_EVENTS.TRIP_PAID, refetchIfThisTrip)

  if (isLoading) return <LoadingSpinner size="lg" className="mt-16" />
  if (!trip) return <p className="text-slate-500">Trip not found.</p>

  const canEdit = ['PENDING', 'ASSIGNED'].includes(trip.status)
  const canDelete = trip.status === 'PENDING'
  const nextStatus = NEXT_STATUS[trip.status]

  const handleAdvanceStatus = async () => {
    setIsBusy(true)
    try {
      await tripService.updateStatus(tripId, nextStatus)
      showNotification(`Trip moved to ${nextStatus.replace('_', ' ')}`, 'success')
      load()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to update status', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleApprove = async () => {
    setIsBusy(true)
    try {
      await tripService.approveTrip(tripId)
      showNotification('Trip approved and invoice generated', 'success')
      setModal(null)
      load()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to approve trip', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleMarkPaid = async (values) => {
    setIsBusy(true)
    try {
      await tripService.markAsPaid(tripId, values)
      showNotification('Trip marked as paid', 'success')
      setModal(null)
      load()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to record payment', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleEdit = async (values) => {
    setIsBusy(true)
    try {
      await tripService.updateTrip(tripId, values)
      showNotification('Trip updated successfully', 'success')
      setModal(null)
      load()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to update trip', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return
    setIsBusy(true)
    try {
      await tripService.deleteTrip(tripId)
      showNotification('Trip deleted', 'success')
      navigate('/trips')
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to delete trip', 'error')
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{trip.tripNumber}</h1>
          <p className="text-slate-500">
            {trip.truckNumber} &middot; {trip.transporterName}
          </p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="flex flex-wrap gap-3">
        {nextStatus && (
          <Button onClick={handleAdvanceStatus} isLoading={isBusy}>
            {NEXT_STATUS_LABEL[trip.status]}
          </Button>
        )}
        {trip.status === 'COMPLETED' && <Button onClick={() => setModal('approve')}>Approve & Invoice</Button>}
        {trip.status === 'INVOICED' && (
          <>
            <Button onClick={() => setModal('markPaid')}>Mark as Paid</Button>
            <a href={tripService.invoiceDownloadUrl(tripId)} target="_blank" rel="noreferrer">
              <Button variant="secondary">Download Invoice</Button>
            </a>
          </>
        )}
        {trip.status === 'PAID' && (
          <a href={tripService.invoiceDownloadUrl(tripId)} target="_blank" rel="noreferrer">
            <Button variant="secondary">Download Invoice</Button>
          </a>
        )}
        {canEdit && (
          <Button variant="secondary" onClick={() => setModal('edit')}>
            Edit
          </Button>
        )}
        {canDelete && (
          <Button variant="danger" onClick={handleDelete} isLoading={isBusy}>
            Delete
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Trip Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Loading Point</dt>
                <dd className="font-medium text-slate-900">{trip.loadingPoint}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Offloading Point</dt>
                <dd className="font-medium text-slate-900">{trip.offloadingPoint}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date Loaded</dt>
                <dd className="font-medium text-slate-900">{formatDate(trip.dateLoaded)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date Offloaded</dt>
                <dd className="font-medium text-slate-900">{formatDate(trip.dateOffloaded)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Trailer Number</dt>
                <dd className="font-medium text-slate-900">{trip.trailerNumber || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created By</dt>
                <dd className="font-medium text-slate-900">
                  {trip.createdBy?.firstName} {trip.createdBy?.lastName}
                </dd>
              </div>
            </dl>
            {trip.notes && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{trip.notes}</div>
            )}
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Change History</h2>
            <AuditLog entries={auditEntries} />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Financial Summary</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Transportation Rate</dt>
                <dd>{formatCurrency(trip.transportationRate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Diesel Per Trip</dt>
                <dd>{formatCurrency(trip.dieselPerTrip)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Mileage Cash</dt>
                <dd>{formatCurrency(trip.mileageCash)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-500">
                <dt>Service Fee (5%)</dt>
                <dd>{formatCurrency(trip.serviceFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-primary-700">
                <dt>Total</dt>
                <dd>{formatCurrency(trip.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          {trip.invoiceNumber && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Invoice</h2>
              <p className="text-sm text-slate-600">Number: {trip.invoiceNumber}</p>
              <p className="text-sm text-slate-600">Generated: {formatDateTime(trip.invoiceGeneratedAt)}</p>
            </section>
          )}

          {trip.paymentDetails?.paymentDate && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Payment</h2>
              <p className="text-sm text-slate-600">Date: {formatDate(trip.paymentDetails.paymentDate)}</p>
              <p className="text-sm text-slate-600">Method: {trip.paymentDetails.paymentMethod?.replace('_', ' ')}</p>
              <p className="text-sm text-slate-600">Amount: {formatCurrency(trip.paymentDetails.amountPaid)}</p>
              {trip.paymentDetails.confirmationRef && (
                <p className="text-sm text-slate-600">Ref: {trip.paymentDetails.confirmationRef}</p>
              )}
            </section>
          )}
        </div>
      </div>

      <TripApprovalModal
        trip={trip}
        isOpen={modal === 'approve'}
        onClose={() => setModal(null)}
        onConfirm={handleApprove}
        isSubmitting={isBusy}
      />
      <MarkPaidModal
        trip={trip}
        isOpen={modal === 'markPaid'}
        onClose={() => setModal(null)}
        onSubmit={handleMarkPaid}
        isSubmitting={isBusy}
      />
      <Modal isOpen={modal === 'edit'} onClose={() => setModal(null)} title="Edit Trip">
        <TripForm trip={trip} onSubmit={handleEdit} isSubmitting={isBusy} onCancel={() => setModal(null)} />
      </Modal>
    </div>
  )
}
