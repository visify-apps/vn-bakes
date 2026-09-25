import { simpleStatusMeta, statusTone } from '../../utils/simpleStatus'

export function StatusBadge({ status }) {
  const meta = simpleStatusMeta(status)
  return (
    <span className={`status-badge status-${statusTone(meta.id)}`}>
      {meta.label}
    </span>
  )
}
