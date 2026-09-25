import { deliveryDateKey, localDateKey, sortByDeliveryDate } from './jobDate'
import { toSimpleStatus } from './simpleStatus'

export function buildHomeLists(enquiries = [], today = localDateKey()) {
  const byStatus = (id) =>
    sortByDeliveryDate(enquiries.filter((e) => toSimpleStatus(e.status) === id))

  const newJobs = byStatus('NEW')
  const noAdvance = byStatus('QUOTED')
  const baking = byStatus('IN_PROGRESS')

  const live = enquiries.filter((e) => {
    const simple = toSimpleStatus(e.status)
    return simple !== 'HANDED_OVER' && simple !== 'CANCELLED'
  })
  const dueToday = live.filter((e) => deliveryDateKey(e) === today)
  const late = live.filter((e) => {
    const key = deliveryDateKey(e)
    return key !== '9999-99-99' && key < today
  })

  return {
    newJobs,
    noAdvance,
    baking,
    counts: {
      new: newJobs.length,
      noAdvance: noAdvance.length,
      baking: baking.length,
      today: dueToday.length,
      late: late.length,
    },
  }
}
