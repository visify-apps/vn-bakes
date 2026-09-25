import { toSimpleStatus } from './simpleStatus'
import { amountDue, buildMoneyLists } from './moneyLists'
import { deliveryDateKey, localDateKey, shiftDateKey } from './jobDate'

function daysBetween(fromIso, toIso) {
  const a = new Date(`${fromIso}T00:00:00`).getTime()
  const b = new Date(`${toIso}T00:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}

function createdDateKey(enquiry) {
  const raw = String(enquiry?.createdAt || '')
  const iso = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : ''
}

function monthKey(iso) {
  return iso ? iso.slice(0, 7) : ''
}

function lastMonthKey(today) {
  const first = `${today.slice(0, 7)}-01`
  return monthKey(shiftDateKey(first, -1))
}

function bump(map, key, by = 1) {
  const label = String(key || '').trim()
  if (!label || label === 'null' || label === 'undefined') return
  map[label] = (map[label] || 0) + by
}

function ranked(map, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

function pct(part, whole) {
  if (!whole) return '—'
  return `${Math.round((part / whole) * 100)}%`
}

function eggLabel(value) {
  if (value === 'egg') return 'Egg'
  if (value === 'eggless') return 'Eggless'
  return ''
}

function prettyType(enquiry) {
  return enquiry.productName || enquiry.requestType || 'Other'
}

export function buildReports({
  enquiries = [],
  customers = [],
  products = [],
  categories = [],
  today = localDateKey(),
} = {}) {
  const thisMonth = monthKey(today)
  const prevMonth = lastMonthKey(today)
  const weekEnd = shiftDateKey(today, 6)
  const weekStart = shiftDateKey(today, -6)

  const categoryName = (id) => categories.find((item) => item.id === id)?.name || id || 'Other'
  const productById = Object.fromEntries(products.map((item) => [item.id, item]))

  let quoted = 0
  let advanceIn = 0
  let fullyPaid = 0
  let sales = 0
  let salesThisMonth = 0
  let salesLastMonth = 0
  let createdThisMonth = 0
  let createdLastMonth = 0
  let needByThisMonth = 0
  let leadSum = 0
  let leadCount = 0
  let autoPriced = 0
  let bakerQuoted = 0
  let pickup = 0
  let delivery = 0

  const pipeline = { NEW: 0, QUOTED: 0, IN_PROGRESS: 0, HANDED_OVER: 0, CANCELLED: 0 }
  const requestTypes = {}
  const productsOrdered = {}
  const occasions = {}
  const sizes = {}
  const flavours = {}
  const eggs = {}
  const shapes = {}
  const themes = {}
  const areas = {}
  const pincodes = {}
  const needBy = {}
  const phones = {}
  const productHits = {}
  const categoryHits = {}

  for (const enquiry of enquiries) {
    const simple = toSimpleStatus(enquiry.status)
    pipeline[simple] = (pipeline[simple] || 0) + 1

    const created = createdDateKey(enquiry)
    const createdMonth = monthKey(created)
    if (createdMonth === thisMonth) createdThisMonth += 1
    if (createdMonth === prevMonth) createdLastMonth += 1

    const need = deliveryDateKey(enquiry)
    if (need !== '9999-99-99' && monthKey(need) === thisMonth) needByThisMonth += 1
    if (need !== '9999-99-99' && need >= today && need <= weekEnd) bump(needBy, need)

    if (created && need !== '9999-99-99') {
      const lead = daysBetween(created, need)
      if (Number.isFinite(lead)) {
        leadSum += lead
        leadCount += 1
      }
    }

    const quote = Number(enquiry.quotedPrice)
    if (Number.isFinite(quote) && enquiry.quotedPrice != null) quoted += quote

    if (simple === 'IN_PROGRESS' || simple === 'HANDED_OVER') {
      advanceIn += Number(enquiry.advanceRequired) || 0
    }
    if (enquiry.paymentStatus === 'PAID') fullyPaid += Number(enquiry.quotedPrice) || 0

    if (simple === 'HANDED_OVER') {
      const amount = Number(enquiry.quotedPrice) || 0
      sales += amount
      const doneMonth = monthKey(need !== '9999-99-99' ? need : created)
      if (doneMonth === thisMonth) salesThisMonth += amount
      if (doneMonth === prevMonth) salesLastMonth += amount
    }

    if (enquiry.quotedPrice != null) {
      if (enquiry.autoPriced) autoPriced += 1
      else bakerQuoted += 1
    }

    if (enquiry.fulfillmentType === 'delivery') {
      delivery += 1
      bump(areas, enquiry.deliveryAddress?.area)
      bump(pincodes, enquiry.deliveryAddress?.pincode)
    } else if (enquiry.fulfillmentType === 'pickup') {
      pickup += 1
    }

    bump(requestTypes, enquiry.requestType || prettyType(enquiry))
    if (enquiry.productName || enquiry.productId) {
      bump(productsOrdered, enquiry.productName || productById[enquiry.productId]?.name || enquiry.productId)
    }
    bump(occasions, enquiry.occasion)
    bump(sizes, enquiry.cakeSize || (enquiry.servings ? `${enquiry.servings} servings` : ''))
    bump(flavours, enquiry.flavour)
    bump(eggs, eggLabel(enquiry.eggPreference))
    bump(shapes, enquiry.shape)
    bump(themes, enquiry.theme)
    bump(phones, enquiry.customerSnapshot?.phone)

    if (enquiry.productId) {
      bump(productHits, enquiry.productName || productById[enquiry.productId]?.name || enquiry.productId)
      const categoryId = productById[enquiry.productId]?.categoryId
      if (categoryId) bump(categoryHits, categoryName(categoryId))
    }
  }

  const cancelled = pipeline.CANCELLED
  const taken = enquiries.length - cancelled
  const handed = pipeline.HANDED_OVER
  const money = buildMoneyLists(enquiries)
  const uniquePhones = Object.keys(phones).length
  const repeatPhones = Object.values(phones).filter((count) => count > 1).length

  const customerNew = customers.filter((item) => Number(item.totalEnquiries || 0) <= 1).length
  const customerRepeat = customers.filter((item) => Number(item.totalEnquiries || 0) > 1).length
  const topSpend = [...customers]
    .sort((a, b) => (Number(b.totalSpend) || 0) - (Number(a.totalSpend) || 0))
    .slice(0, 6)
    .filter((item) => Number(item.totalSpend) > 0)
    .map((item) => ({
      label: item.name || item.phone,
      count: Number(item.totalSpend) || 0,
      money: true,
    }))

  const recency = { week: 0, month: 0, older: 0 }
  for (const customer of customers) {
    const last = String(customer.lastEnquiryAt || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(last)) {
      recency.older += 1
      continue
    }
    if (last >= weekStart) recency.week += 1
    else if (monthKey(last) === thisMonth) recency.month += 1
    else recency.older += 1
  }

  const available = products.filter((item) => item.available !== false).length
  const hidden = products.length - available

  const weekJobs = enquiries.filter((enquiry) => {
    const key = deliveryDateKey(enquiry)
    return key !== '9999-99-99' && key >= today && key <= weekEnd
  }).length

  return {
    money: {
      quoted,
      advanceIn,
      due: money.dueTotal,
      fullyPaid,
      sales,
      averageTicket: handed ? Math.round(sales / handed) : 0,
      owingCount: enquiries.filter((enquiry) => amountDue(enquiry) > 0).length,
    },
    pipeline: {
      new: pipeline.NEW,
      quoted: pipeline.QUOTED,
      baking: pipeline.IN_PROGRESS,
      done: handed,
      cancelled,
      taken,
      conversion: pct(handed, taken),
      cancelRate: pct(cancelled, enquiries.length),
      weekJobs,
      monthJobs: createdThisMonth,
      lastMonthJobs: createdLastMonth,
      needByThisMonth,
      salesThisMonth,
      salesLastMonth,
    },
    ordered: {
      requestTypes: ranked(requestTypes),
      products: ranked(productsOrdered),
      occasions: ranked(occasions),
      sizes: ranked(sizes),
      flavours: ranked(flavours),
      eggs: ranked(eggs),
      shapes: ranked(shapes),
      themes: ranked(themes),
      pricing: [
        { label: 'Auto-priced', count: autoPriced },
        { label: 'Baker quoted', count: bakerQuoted },
      ].filter((item) => item.count),
    },
    handover: {
      pickup,
      delivery,
      areas: ranked(areas),
      pincodes: ranked(pincodes),
      busyDays: ranked(needBy, 8).map((item) => ({
        label: item.label,
        count: item.count,
      })),
      avgLeadDays: leadCount ? Math.round(leadSum / leadCount) : null,
    },
    people: {
      unique: uniquePhones || customers.length,
      newCount: customerNew || uniquePhones - repeatPhones,
      repeatCount: customerRepeat || repeatPhones,
      topSpend,
      recency,
    },
    menu: {
      available,
      hidden,
      products: ranked(productHits),
      categories: ranked(categoryHits),
    },
  }
}
