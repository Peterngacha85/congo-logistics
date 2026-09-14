import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { formatCurrency } from '../../utils/formatters'

export default function TripApprovalModal({ trip, isOpen, onClose, onConfirm, isSubmitting }) {
  if (!trip) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve & Generate Invoice"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isSubmitting}>
            Confirm Approval
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        This will generate an invoice for trip <strong>{trip.tripNumber}</strong> and permanently move it to{' '}
        <strong>INVOICED</strong>. This action cannot be undone.
      </p>
      <div className="mt-4 rounded-lg bg-accent-100 p-3 text-sm">
        <div className="flex justify-between font-semibold text-primary-800">
          <span>Total Amount</span>
          <span>{formatCurrency(trip.totalAmount)}</span>
        </div>
      </div>
    </Modal>
  )
}
