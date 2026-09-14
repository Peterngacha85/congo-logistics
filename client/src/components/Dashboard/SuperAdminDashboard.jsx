import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportService } from '../../services/reportService'
import { tripService } from '../../services/tripService'
import { formatCurrency } from '../../utils/formatters'
import { useSocketEvent } from '../../hooks/useSocket'
import { SOCKET_EVENTS } from '../../utils/constants'
import StatsCard from './StatsCard'
import LoadingSpinner from '../Common/LoadingSpinner'

export default function SuperAdminDashboard({ user }) {
  const [overview, setOverview] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const load = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)

    Promise.all([
      reportService.getCompanyOverview(from.toISOString(), to.toISOString()),
      tripService.getTrips({ status: 'COMPLETED', limit: 1 })
    ])
      .then(([overviewRes, tripsRes]) => {
        setOverview(overviewRes.data.data)
        setPendingCount(tripsRes.data.pagination.totalRecords)
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => load(), [])

  const refetchSilently = () => load(false)
  useSocketEvent(SOCKET_EVENTS.TRIP_CREATED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_STATUS_CHANGED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_INVOICED, refetchSilently)
  useSocketEvent(SOCKET_EVENTS.TRIP_PAID, refetchSilently)

  if (isLoading) return <LoadingSpinner size="lg" className="mt-16" />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user.firstName}</h1>
        <p className="text-slate-500">Company-wide overview, last 30 days</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Trips" value={overview?.totalTrips ?? 0} />
        <StatsCard label="Total Revenue" value={formatCurrency(overview?.totalRevenue)} accent="secondary" />
        <StatsCard label="Net Profit" value={formatCurrency(overview?.netProfit)} accent="secondary" />
        <StatsCard label="Pending Approvals" value={pendingCount} accent="slate" />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Branch Performance</h2>
          <Link to="/reports" className="text-sm text-primary-600 hover:underline">
            Full reports
          </Link>
        </div>
        <div className="overflow-x-auto">
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
              {overview?.branchBreakdown.map((branch) => (
                <tr key={branch.branchName}>
                  <td className="py-2.5 font-medium text-slate-900">{branch.branchName}</td>
                  <td className="py-2.5">{branch.trips}</td>
                  <td className="py-2.5">{formatCurrency(branch.revenue)}</td>
                  <td className="py-2.5">{formatCurrency(branch.expenses)}</td>
                  <td className="py-2.5 font-medium text-primary-700">{formatCurrency(branch.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
