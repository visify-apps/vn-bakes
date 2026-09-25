/**
 * Baker-facing statuses — driven by actions, not a picker.
 *
 * New → quote sent on WhatsApp
 * Quoted → waiting for advance
 * In progress → advance received, baking
 * Handed over → picked up / delivered
 * Cancelled → not going ahead
 */

export const SIMPLE_STATUSES = [
  {
    id: 'NEW',
    label: 'New',
    hint: 'Enter a price and send it on WhatsApp.',
    storeAs: 'NEW',
  },
  {
    id: 'QUOTED',
    label: 'Quoted',
    hint: 'Waiting for the advance.',
    storeAs: 'QUOTE_SENT',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In progress',
    hint: 'Advance received — bake this order.',
    storeAs: 'IN_PREPARATION',
  },
  {
    id: 'HANDED_OVER',
    label: 'Handed over',
    hint: 'Picked up or delivered.',
    storeAs: 'COMPLETED',
  },
  {
    id: 'CANCELLED',
    label: 'Cancelled',
    hint: 'Not going ahead.',
    storeAs: 'CANCELLED',
  },
]

const TO_SIMPLE = {
  NEW: 'NEW',
  REVIEWING: 'NEW',
  QUOTE_SENT: 'QUOTED',
  CUSTOMER_CONFIRMED: 'QUOTED',
  ADVANCE_PENDING: 'QUOTED',
  CONFIRMED: 'IN_PROGRESS',
  IN_PREPARATION: 'IN_PROGRESS',
  READY: 'IN_PROGRESS',
  COMPLETED: 'HANDED_OVER',
  CANCELLED: 'CANCELLED',
  REJECTED: 'CANCELLED',
}

export function toSimpleStatus(raw) {
  return TO_SIMPLE[raw] || 'NEW'
}

export function statusTone(rawOrSimple) {
  const id = SIMPLE_STATUSES.some((s) => s.id === rawOrSimple)
    ? rawOrSimple
    : toSimpleStatus(rawOrSimple)
  return id.toLowerCase().replace(/_/g, '-')
}

export function simpleStatusMeta(rawOrSimple) {
  const id = SIMPLE_STATUSES.some((s) => s.id === rawOrSimple)
    ? rawOrSimple
    : toSimpleStatus(rawOrSimple)
  return SIMPLE_STATUSES.find((s) => s.id === id) || SIMPLE_STATUSES[0]
}

export function storeStatusFromSimple(simpleId) {
  return SIMPLE_STATUSES.find((s) => s.id === simpleId)?.storeAs || 'NEW'
}

const FLOW = ['NEW', 'QUOTED', 'IN_PROGRESS', 'HANDED_OVER']

export function previousSimpleStatus(simpleId, statusBeforeCancel) {
  if (simpleId === 'CANCELLED') {
    return toSimpleStatus(statusBeforeCancel || 'NEW')
  }
  const index = FLOW.indexOf(simpleId)
  if (index <= 0) return null
  return FLOW[index - 1]
}

export function revertConfirmMessage(simpleId) {
  if (simpleId === 'QUOTED') return 'Move this back to New? You can send the quote again.'
  if (simpleId === 'IN_PROGRESS') {
    return 'Move this back to Quoted? This treats the advance as not received yet.'
  }
  if (simpleId === 'HANDED_OVER') return 'Move this back to In progress?'
  if (simpleId === 'CANCELLED') return 'Restore this cancelled job?'
  return 'Go back to the previous step?'
}

export const SIMPLE_PAYMENT = [
  { id: 'UNPAID', label: 'Unpaid' },
  { id: 'PARTIALLY_PAID', label: 'Advance paid' },
  { id: 'PAID', label: 'Fully paid' },
]
