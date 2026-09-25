import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  deleteField,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'
import { getFirestoreDb } from '../firebase'
import { demoEnquiries } from '../../data/demoEnquiries'
import { deliveryDateKey, localDateKey, shiftDateKey, sortByDeliveryDate } from '../../utils/jobDate'
import { toSimpleStatus } from '../../utils/simpleStatus'

const DEMO_STORE_KEY = 'ck_admin_demo_enquiries_v1'

function cloneDemo() {
  return demoEnquiries.map((e) => ({ ...e, deliveryAddress: e.deliveryAddress ? { ...e.deliveryAddress } : null, customerSnapshot: { ...e.customerSnapshot } }))
}

function readDemoStore() {
  try {
    const raw = localStorage.getItem(DEMO_STORE_KEY)
    if (!raw) {
      const seed = cloneDemo()
      localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(seed))
      return seed
    }
    return JSON.parse(raw)
  } catch {
    return cloneDemo()
  }
}

function writeDemoStore(items) {
  try {
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

/** Keep a locally submitted enquiry on the baker’s job list (demo / offline). */
export function appendDemoEnquiry(enquiry) {
  if (!enquiry?.id) return
  const items = readDemoStore()
  if (items.some((item) => item.id === enquiry.id)) return
  const now = new Date().toISOString()
  writeDemoStore([
    {
      ...enquiry,
      createdAt: enquiry.createdAt || now,
      updatedAt: enquiry.updatedAt || now,
    },
    ...items,
  ])
}

function normalizeEnquiry(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
  }
}

/**
 * @param {string} [businessId]
 */
export async function listEnquiries(businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    return readDemoStore().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }

  try {
    const db = getFirestoreDb()
    const ref = collection(db, 'businesses', businessId, 'enquiries')
    const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')))
    return snap.docs.map((d) => normalizeEnquiry(d.id, d.data()))
  } catch {
    return []
  }
}

/**
 * @param {string} enquiryId
 * @param {string} [businessId]
 */
export async function getEnquiry(enquiryId, businessId = appConfig.defaultBusinessId) {
  if (!enquiryId) return null

  if (!isFirebaseConfigured()) {
    return readDemoStore().find((e) => e.id === enquiryId || e.enquiryNumber === enquiryId) || null
  }

  try {
    const db = getFirestoreDb()
    const snap = await getDoc(doc(db, 'businesses', businessId, 'enquiries', enquiryId))
    if (snap.exists()) return normalizeEnquiry(snap.id, snap.data())
    return null
  } catch {
    return null
  }
}

/**
 * @param {string} enquiryId
 * @param {Record<string, unknown>} patch
 * @param {string} [businessId]
 */
export async function updateEnquiry(enquiryId, patch, businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    const items = readDemoStore()
    const idx = items.findIndex((e) => e.id === enquiryId)
    if (idx === -1) throw new Error('Enquiry not found')
    const next = {
      ...items[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    for (const key of Object.keys(patch)) {
      if (patch[key] === null) delete next[key]
    }
    items[idx] = next
    writeDemoStore(items)
    return next
  }

  const db = getFirestoreDb()
  const ref = doc(db, 'businesses', businessId, 'enquiries', enquiryId)
  const firestorePatch = {}
  for (const [key, value] of Object.entries(patch)) {
    firestorePatch[key] = value === null ? deleteField() : value
  }
  await updateDoc(ref, {
    ...firestorePatch,
    updatedAt: serverTimestamp(),
  })
  return getEnquiry(enquiryId, businessId)
}

export function computeBalance(quotedPrice, advanceRequired) {
  const quote = Number(quotedPrice) || 0
  const advance = Number(advanceRequired) || 0
  return Math.max(quote - advance, 0)
}

/**
 * Dashboard counters from enquiry list.
 */
export function summarizeEnquiries(enquiries = []) {
  const today = localDateKey()
  const weekEnd = shiftDateKey(today, 6)
  const newCount = enquiries.filter((e) => toSimpleStatus(e.status) === 'NEW').length
  const waitingCount = enquiries.filter((e) => toSimpleStatus(e.status) === 'QUOTED').length
  const upcoming = sortByDeliveryDate(
    enquiries.filter((e) => {
      const simple = toSimpleStatus(e.status)
      if (simple === 'HANDED_OVER' || simple === 'CANCELLED') return false
      const key = deliveryDateKey(e)
      return key !== '9999-99-99' && key >= today
    }),
  )
  const thisWeek = upcoming.filter((e) => deliveryDateKey(e) <= weekEnd)
  const todayCount = enquiries.filter((e) => String(e.createdAt || '').startsWith(today)).length

  return {
    todayCount,
    newCount,
    pendingQuotes: newCount,
    pendingConfirmations: waitingCount,
    waitingCount,
    thisWeekCount: thisWeek.length,
    upcomingOrders: upcoming.length,
    upcomingDates: upcoming.slice(0, 20),
  }
}
