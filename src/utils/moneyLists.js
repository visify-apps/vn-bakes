import { sortByDeliveryDate } from './jobDate'
import { toSimpleStatus } from './simpleStatus'

/**
 * Balance still to collect after advance is in.
 * Quoted / new jobs are not confirmed yet — their advance is not listed here.
 */
export function amountDue(enquiry) {
  const simple = toSimpleStatus(enquiry?.status)
  if (!enquiry || enquiry.paymentStatus === 'PAID') return 0
  if (simple !== 'IN_PROGRESS' && simple !== 'HANDED_OVER') return 0
  return Number(enquiry.balanceAmount) || 0
}

export function buildMoneyLists(enquiries = []) {
  const due = sortByDeliveryDate(enquiries.filter((e) => amountDue(e) > 0))
  return {
    due,
    dueTotal: due.reduce((sum, e) => sum + amountDue(e), 0),
  }
}
