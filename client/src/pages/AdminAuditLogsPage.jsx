import { useEffect, useState } from 'react'
import { auditService } from '../services/auditService'
import { useNotification } from '../hooks/useNotification'
import { formatDateTime } from '../utils/formatters'
import LoadingSpinner from '../components/Common/LoadingSpinner'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { showNotification } = useNotification()

  useEffect(() => {
    auditService
      .getAllAuditLogs({ limit: 100 })
      .then(({ data }) => setLogs(data.data))
      .catch(() => showNotification('Failed to load audit logs', 'error'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDateTime(log.timestamp)}</td>
                  <td className="px-4 py-3">{log.entityType}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">{log.userName}</td>
                  <td className="px-4 py-3 text-slate-600">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
