export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftDateKey(iso, days) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return localDateKey(d)
}

export function formatHomeDate(iso = localDateKey()) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function homeDateParts(iso = localDateKey()) {
  const d = new Date(`${iso}T00:00:00`)
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    rest: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }),
  }
}

export function deliveryDateKey(enquiry) {
  const raw = String(enquiry?.preferredDate || enquiry?.deliveryDate || '')
  const iso = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '9999-99-99'
}

export function deliveryGroupLabel(iso, today = localDateKey()) {
  if (!iso || iso === '9999-99-99') return 'No date'
  if (iso === today) return 'Today'
  if (iso === shiftDateKey(today, 1)) return 'Tomorrow'
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function groupByDeliveryDate(items = []) {
  const groups = []
  const map = new Map()
  for (const item of sortByDeliveryDate(items)) {
    const key = deliveryDateKey(item)
    if (!map.has(key)) {
      const group = { key, label: deliveryGroupLabel(key), items: [] }
      map.set(key, group)
      groups.push(group)
    }
    map.get(key).items.push(item)
  }
  return groups
}

export function deliveryParts(enquiry) {
  const raw = String(enquiry?.preferredDate || enquiry?.deliveryDate || '')
  const iso = raw.slice(0, 10)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : null
  if (!d || Number.isNaN(d.getTime())) {
    return { day: '—', month: '', weekday: enquiry?.preferredDateLabel || 'No date' }
  }
  return {
    day: d.toLocaleDateString('en-IN', { day: 'numeric' }),
    month: d.toLocaleDateString('en-IN', { month: 'short' }),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
  }
}

export function sortByDeliveryDate(items = []) {
  return [...items].sort((a, b) => deliveryDateKey(a).localeCompare(deliveryDateKey(b)))
}

export function daysUntilDelivery(enquiry, today = localDateKey()) {
  const key = deliveryDateKey(enquiry)
  if (key === '9999-99-99') return null
  const a = new Date(`${today}T00:00:00`)
  const b = new Date(`${key}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

export function dueLabel(enquiry, today = localDateKey()) {
  const days = daysUntilDelivery(enquiry, today)
  if (days == null) return 'No date'
  if (days < 0) return `${Math.abs(days)}d late`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days}d`
}
