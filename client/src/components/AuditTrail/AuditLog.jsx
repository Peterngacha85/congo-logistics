import { formatDateTime } from '../../utils/formatters'

function renderChange(field, change) {
  if (change && typeof change === 'object' && 'oldValue' in change) {
    return (
      <span>
        <span className="font-medium">{field}</span>: {String(change.oldValue ?? '-')} &rarr;{' '}
        {String(change.newValue ?? '-')}
      </span>
    )
  }
  return (
    <span>
      <span className="font-medium">{field}</span>: {String(change)}
    </span>
  )
}

export default function AuditLog({ entries = [] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No audit history yet.</p>
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry._id} className="border-l-2 border-primary-200 pl-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{entry.description}</p>
            <span className="text-xs text-slate-400">{formatDateTime(entry.timestamp)}</span>
          </div>
          <p className="text-xs text-slate-500">
            {entry.user?.name || 'Unknown'} {entry.user?.role ? `(${entry.user.role})` : ''}
          </p>
          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-slate-600">
              {Object.entries(entry.changes).map(([field, change]) => (
                <li key={field}>{renderChange(field, change)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
