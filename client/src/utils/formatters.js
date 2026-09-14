export function formatCurrency(amount) {
  const value = Number(amount) || 0
  return `${value.toLocaleString('en-US')} CDF`
}

export function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function toDateInputValue(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().slice(0, 10)
}

export function statusLabel(status) {
  return String(status || '').replace(/_/g, ' ')
}
