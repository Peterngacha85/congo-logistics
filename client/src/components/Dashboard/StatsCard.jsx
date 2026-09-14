export default function StatsCard({ label, value, accent = 'primary' }) {
  const accents = {
    primary: 'border-primary-600',
    secondary: 'border-secondary-500',
    slate: 'border-slate-400'
  }

  return (
    <div className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${accents[accent]}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
