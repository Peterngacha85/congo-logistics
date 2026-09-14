import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { invoiceService } from '../services/invoiceService'
import { branchService } from '../services/branchService'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { useSocketEvent } from '../hooks/useSocket'
import { formatCurrency, formatDate } from '../utils/formatters'
import { ROLES, SOCKET_EVENTS } from '../utils/constants'
import Button from '../components/Common/Button'
import Badge from '../components/Common/Badge'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE']

const INVOICE_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-emerald-200 text-emerald-900',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800'
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const isAdmin = user.role === ROLES.SUPER_ADMIN
  const [searchParams, setSearchParams] = useSearchParams()
  const [invoices, setInvoices] = useState([])
  const [branches, setBranches] = useState([])
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { showNotification } = useNotification()

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const branchId = searchParams.get('branchId') || ''
  const page = Number(searchParams.get('page') || 1)

  const fetchInvoices = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    invoiceService
      .getInvoices({
        search: search || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        branchId: isAdmin && branchId ? branchId : undefined,
        page,
        limit: 20
      })
      .then(({ data }) => {
        setInvoices(data.data)
        setPagination(data.pagination)
      })
      .catch(() => showNotification('Failed to load invoices', 'error'))
      .finally(() => setIsLoading(false))
  }

  useEffect(fetchInvoices, [search, status, dateFrom, dateTo, branchId, page])

  useEffect(() => {
    if (isAdmin) {
      branchService.getBranches().then(({ data }) => setBranches(data.data))
    }
  }, [isAdmin])

  const refetchSilently = () => fetchInvoices(false)
  useSocketEvent(SOCKET_EVENTS.TRIP_INVOICED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_PAID, refetchSilently)

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search invoice # or transporter..."
          defaultValue={search}
          onChange={(e) => updateParam('search', e.target.value)}
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateParam('dateFrom', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateParam('dateTo', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          title="To date"
        />
        {isAdmin && (
          <select
            value={branchId}
            onChange={(e) => updateParam('branchId', e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.branchName}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : invoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No invoices found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Trip</th>
                <th className="px-4 py-3 font-medium">Truck</th>
                <th className="px-4 py-3 font-medium">Transporter</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${inv._id}`} className="font-medium text-primary-700 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/trips/${inv.tripId}`} className="text-slate-500 hover:text-primary-700 hover:underline">
                      {inv.tripNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.truckNumber || '-'}</td>
                  <td className="px-4 py-3">{inv.transporterName}</td>
                  <td className="px-4 py-3">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge className={INVOICE_STYLES[inv.status] || 'bg-slate-100 text-slate-700'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a href={invoiceService.downloadUrl(inv._id)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="secondary">
                        Download
                      </Button>
                    </a>
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
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} invoices)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => updateParam('page', String(page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => updateParam('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
