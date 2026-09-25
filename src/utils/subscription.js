import { localDateKey, shiftDateKey } from './jobDate'

export const DEFAULT_GRACE_DAYS = 3

export function diffDays(fromIso, toIso) {
  const a = new Date(`${fromIso}T00:00:00`).getTime()
  const b = new Date(`${toIso}T00:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}

export function endOfDayMs(iso) {
  return new Date(`${iso}T23:59:59.999`).getTime()
}

/** Extend from the later of today or the current end date. */
export function extendActiveUntil(currentIso, days) {
  const today = localDateKey()
  const base = currentIso && currentIso > today ? currentIso : today
  return shiftDateKey(base, Math.max(0, Number(days) || 0))
}

export function describeAccess(sub, today = localDateKey()) {
  const none = {
    open: false,
    reports: false,
    state: 'unpaid',
    tone: 'stop',
    daysLeft: null,
    activeUntil: null,
    graceEnd: null,
    canResume: false,
  }

  if (!sub || sub.missing) return none

  const grace = Number(sub.graceDays) >= 0 ? Number(sub.graceDays) : DEFAULT_GRACE_DAYS
  const last = sub.activeUntil || null
  const graceEnd = last ? shiftDateKey(last, grace) : null
  const daysLeft = last ? diffDays(today, last) : null
  const inGrace = Boolean(last && today > last && today <= graceEnd)
  const planOpen = Boolean(last && Number(sub.activeUntilMs) > 0 && today <= graceEnd)

  if (sub.paused) {
    return {
      open: false,
      reports: false,
      state: 'paused',
      tone: 'stop',
      daysLeft,
      activeUntil: last,
      graceEnd,
      canResume: planOpen,
    }
  }

  if (sub.awaitingPayment || !last || Number(sub.activeUntilMs) === 0) {
    return none
  }

  if (!planOpen) {
    return {
      ...none,
      state: 'closed',
      activeUntil: last,
      graceEnd,
      daysLeft,
    }
  }

  const reports = Boolean(sub.addons?.reports)
  let state = 'ok'
  let tone = 'ok'
  if (inGrace) {
    state = 'grace'
    tone = 'hot'
  } else if (daysLeft <= 0) {
    state = 'last'
    tone = 'hot'
  } else if (daysLeft <= 3) {
    state = 'soon3'
    tone = 'hot'
  } else if (daysLeft <= 7) {
    state = 'soon7'
    tone = 'warn'
  }

  return {
    open: true,
    reports,
    state,
    tone,
    daysLeft,
    activeUntil: last,
    graceEnd,
    canResume: false,
  }
}

export function planLabel(access) {
  if (!access) return ''
  if (access.state === 'unpaid' || access.state === 'legacy') return 'No plan · paused'
  if (access.state === 'paused') {
    return access.activeUntil ? `Paused · plan until ${access.activeUntil}` : 'Paused'
  }
  if (access.state === 'closed') return 'Plan ended · paused'
  if (access.state === 'grace') return `Grace until ${access.graceEnd}`
  if (access.activeUntil) return `Until ${access.activeUntil}`
  return 'Live'
}

export function planRowWhen(access) {
  if (!access) return ''
  if (access.state === 'unpaid' || access.state === 'legacy' || access.state === 'paused' || access.state === 'closed') {
    return 'Off'
  }
  if (access.daysLeft == null) return 'Off'
  if (access.daysLeft < 0) return 'Grace'
  if (access.daysLeft === 0) return 'Today'
  return `${access.daysLeft}d`
}

export function planHighlight(access) {
  if (!access) return { badge: '', value: '—', detail: '' }
  if (access.state === 'unpaid' || access.state === 'legacy') {
    return {
      badge: 'Paused',
      value: 'No active plan',
      detail: 'Record a payment to open enquiries',
    }
  }
  if (access.state === 'paused') {
    return {
      badge: 'Paused',
      value: access.activeUntil
        ? `${access.daysLeft < 0 ? 'Grace' : `${Math.max(access.daysLeft, 0)} day${access.daysLeft === 1 ? '' : 's'} left`}`
        : 'No active plan',
      detail: access.activeUntil
        ? `Same plan until ${access.activeUntil}. Resume does not start a new plan.`
        : 'Record a payment to open enquiries',
    }
  }
  if (access.state === 'closed') {
    return {
      badge: 'Paused',
      value: `Plan ended ${access.activeUntil}`,
      detail: 'Record a payment to reopen. Remaining days are gone.',
    }
  }
  if (access.state === 'grace') {
    return { badge: 'Grace', value: access.graceEnd, detail: `Plan ended ${access.activeUntil}` }
  }
  if (access.daysLeft === 0) {
    return { badge: 'Last day', value: access.activeUntil, detail: 'Plan ends today' }
  }
  return {
    badge: access.reports ? 'Live · Reports' : 'Live',
    value: `${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} left`,
    detail: `Until ${access.activeUntil}`,
  }
}

export function ownerPlanMessage(access) {
  if (!access || access.state === 'ok') return ''
  const until = access.activeUntil
  if (access.state === 'soon7' || access.state === 'soon3') {
    return `Plan ends ${until} · ${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} left`
  }
  if (access.state === 'last') return `Last day of the plan · ${until}`
  if (access.state === 'grace') return `Plan ended ${until}. New enquiries pause after ${access.graceEnd}`
  if (access.state === 'paused' && until) {
    return `New enquiries are paused. Plan still runs until ${until}.`
  }
  if (access.state === 'closed') return `Plan ended ${until}. New enquiries are paused.`
  return 'No active plan. New enquiries are paused.'
}

export function planDatesFromPayment(payment, graceDays = DEFAULT_GRACE_DAYS) {
  if (!payment) return null
  let activeUntil = payment.activeUntil || null
  if (!activeUntil && payment.paidAt && payment.days) {
    activeUntil = shiftDateKey(String(payment.paidAt).slice(0, 10), Number(payment.days) || 0)
  }
  if (!activeUntil) return null
  const grace = Number(graceDays) >= 0 ? Number(graceDays) : DEFAULT_GRACE_DAYS
  return {
    activeUntil,
    activeUntilMs: endOfDayMs(shiftDateKey(activeUntil, grace)),
    reports: Boolean(payment.reports),
  }
}

export function customerClosedMessage() {
  return 'Not taking orders right now. You’re welcome to browse the menu.'
}
