import Badge from '../Common/Badge'
import { STATUS_STYLES } from '../../utils/constants'
import { statusLabel } from '../../utils/formatters'

export default function StatusBadge({ status }) {
  return <Badge className={STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'}>{statusLabel(status)}</Badge>
}
