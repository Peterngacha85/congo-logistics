import { useState } from 'react'
import { reportService } from '../services/reportService'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { formatCurrency } from '../utils/formatters'
import { ROLES } from '../utils/constants'
import Button from '../components/Common/Button'
import LoadingSpinner from '../components/Common/LoadingSpinner'

function subDays(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const isAdmin = user.role === ROLES.SUPER_ADMIN

  const [reportType, setReportType] = useState('branch-summary')
  const [dateFrom, setDateFrom] = useState(subDays(30))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [reportData, setReportData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      if (reportType === 'company' && isAdmin) {
        const { data } = await reportService.getCompanyOverview(dateFrom, dateTo)
        setReportData({ type: 'company', ...data.data })
      } else {
        const { data } = await reportService.getBranchSummary(user.branchId, dateFrom, dateTo)
        setReportData({ type: 'branch', ...data.data })
      }
    } catch {
      showNotification('Failed to generate report', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = () => {
    reportService.exportReportCSV(reportType === 'company' ? 'company' : 'branch-summary', {
      branchId: reportType === 'company' ? undefined : user.branchId,
      dateFrom,
      dateTo
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="branch-summary">Branch Summary</option>
            {isAdmin && <option value="company">Company Overview</option>}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={handleGenerate} isLoading={isGenerating}>
          Generate Report
        </Button>
        {reportData && (
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
        )}
      </div>

      {isGenerating && <LoadingSpinner size="lg" className="mt-8" />}

      {reportData?.type === 'branch' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Summary</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Trips</dt>
                <dd className="font-medium">{reportData.summary.totalTrips}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Completed Trips</dt>
                <dd className="font-medium">{reportData.summary.completedTrips}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Revenue</dt>
                <dd className="font-medium">{formatCurrency(reportData.summary.totalRevenue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Diesel Expenses</dt>
                <dd className="font-medium">{formatCurrency(reportData.summary.totalExpenses.diesel)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Mileage Expenses</dt>
                <dd className="font-medium">{formatCurrency(reportData.summary.totalExpenses.mileage)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-primary-700">
                <dt>Net Profit</dt>
                <dd>{formatCurrency(reportData.summary.netProfit)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Average Trip Value</dt>
                <dd className="font-medium">{formatCurrency(reportData.summary.averageTripValue)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Top Transporters</h2>
            {reportData.topTransporters.length === 0 ? (
              <p className="text-sm text-slate-500">No data for this period.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {reportData.topTransporters.map((t) => (
                  <li key={t.name} className="flex justify-between">
                    <span>{t.name}</span>
                    <span className="text-slate-500">
                      {t.trips} trips &middot; {formatCurrency(t.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900">Trips by Status</h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {Object.entries(reportData.byStatus).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-semibold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-500">{status.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reportData?.type === 'company' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Trips</p>
              <p className="text-2xl font-semibold">{reportData.totalTrips}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-semibold">{formatCurrency(reportData.totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Net Profit</p>
              <p className="text-2xl font-semibold text-primary-700">{formatCurrency(reportData.netProfit)}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Branch Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Branch</th>
                  <th className="pb-2 font-medium">Trips</th>
                  <th className="pb-2 font-medium">Revenue</th>
                  <th className="pb-2 font-medium">Expenses</th>
                  <th className="pb-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.branchBreakdown.map((b) => (
                  <tr key={b.branchName}>
                    <td className="py-2.5 font-medium text-slate-900">{b.branchName}</td>
                    <td className="py-2.5">{b.trips}</td>
                    <td className="py-2.5">{formatCurrency(b.revenue)}</td>
                    <td className="py-2.5">{formatCurrency(b.expenses)}</td>
                    <td className="py-2.5 font-medium text-primary-700">{formatCurrency(b.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
