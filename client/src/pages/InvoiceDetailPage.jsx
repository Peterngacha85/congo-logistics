import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { invoiceService } from '../services/invoiceService'
import { useNotification } from '../hooks/useNotification'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters'
import Button from '../components/Common/Button'
import Badge from '../components/Common/Badge'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const INVOICE_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-emerald-200 text-emerald-900',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800'
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const { showNotification } = useNotification()
  const [invoice, setInvoice] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    invoiceService
      .getInvoiceById(invoiceId)
      .then(({ data }) => setInvoice(data.data))
      .catch(() => showNotification('Failed to load invoice', 'error'))
      .finally(() => setIsLoading(false))
  }, [invoiceId])

  if (isLoading) return <LoadingSpinner size="lg" className="mt-16" />
  if (!invoice) return <p className="text-slate-500">Invoice not found.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
          <p className="text-slate-500">
            Trip{' '}
            <Link to={`/trips/${invoice.tripId}`} className="text-primary-700 hover:underline">
              {invoice.tripNumber}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={INVOICE_STYLES[invoice.status] || 'bg-slate-100 text-slate-700'}>
            {invoice.status}
          </Badge>
          <a href={invoiceService.downloadUrl(invoice._id)} target="_blank" rel="noreferrer">
            <Button variant="secondary">Download PDF</Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Trip Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Truck</dt>
                <dd className="font-medium text-slate-900">{invoice.truckNumber || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Transporter</dt>
                <dd className="font-medium text-slate-900">{invoice.transporterName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Loading Point</dt>
                <dd className="font-medium text-slate-900">{invoice.loadingPoint || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Offloading Point</dt>
                <dd className="font-medium text-slate-900">{invoice.offloadingPoint || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date Loaded</dt>
                <dd className="font-medium text-slate-900">{formatDate(invoice.dateLoaded)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date Offloaded</dt>
                <dd className="font-medium text-slate-900">{formatDate(invoice.dateOffloaded)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Line Items</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {invoice.lineItems.map((item) => (
                  <tr key={item.description}>
                    <td className="py-2 text-slate-600">{item.description}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Summary</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd>{formatCurrency(invoice.subtotal)}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 text-slate-500">
                <dt>Service Fee (5%)</dt>
                <dd>{formatCurrency(invoice.serviceFee)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold text-primary-700">
                <dt>Total</dt>
                <dd>{formatCurrency(invoice.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm text-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Dates</h2>
            <p className="text-slate-500">
              Invoice Date <span className="float-right font-medium text-slate-900">{formatDate(invoice.invoiceDate)}</span>
            </p>
            <p className="mt-2 text-slate-500">
              Due Date <span className="float-right font-medium text-slate-900">{formatDate(invoice.dueDate)}</span>
            </p>
            {invoice.paymentReceivedAt && (
              <p className="mt-2 text-slate-500">
                Paid <span className="float-right font-medium text-slate-900">{formatDateTime(invoice.paymentReceivedAt)}</span>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
