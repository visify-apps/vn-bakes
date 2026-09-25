import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'
import { getFirestoreDb } from '../firebase'
import { DEFAULT_GRACE_DAYS, endOfDayMs, extendActiveUntil, planDatesFromPayment } from '../../utils/subscription'
import { shiftDateKey } from '../../utils/jobDate'

const DEMO_SUB_KEY = 'ck_visify_subscription_v1'
const DEMO_PAY_KEY = 'ck_visify_payments_v1'

function demoSubKey(businessId) {
  return `${DEMO_SUB_KEY}_${businessId}`
}

function demoPayKey(businessId) {
  return `${DEMO_PAY_KEY}_${businessId}`
}

export function emptySubscription() {
  return {
    missing: false,
    paused: false,
    awaitingPayment: false,
    activeUntil: null,
    activeUntilMs: 0,
    heldActiveUntil: null,
    heldActiveUntilMs: 0,
    graceDays: DEFAULT_GRACE_DAYS,
    addons: { reports: false },
  }
}

export async function readSubscription(businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    try {
      const raw = localStorage.getItem(demoSubKey(businessId))
      if (!raw) return { ...emptySubscription(), missing: true }
      return { ...emptySubscription(), ...JSON.parse(raw), missing: false }
    } catch {
      return { ...emptySubscription(), missing: true }
    }
  }

  const snap = await getDoc(doc(getFirestoreDb(), 'businesses', businessId, 'settings', 'subscription'))
  if (!snap.exists()) return { ...emptySubscription(), missing: true }
  const data = snap.data()
  return {
    ...emptySubscription(),
    ...data,
    missing: false,
    addons: { reports: false, ...data.addons },
  }
}

export async function listPayments(businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    try {
      const raw = localStorage.getItem(demoPayKey(businessId))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  const snap = await getDocs(collection(getFirestoreDb(), 'businesses', businessId, 'billingPayments'))
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')))
}

function prettyShopName(id) {
  return String(id || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function shopIdFromName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function loadShop(id) {
  const subscription = await hydrateSubscription(id)
  if (!isFirebaseConfigured()) {
    return {
      id,
      displayName: prettyShopName(id),
      kind: 'bakery',
      subscription,
    }
  }

  const db = getFirestoreDb()
  const [root, general] = await Promise.all([
    getDoc(doc(db, 'businesses', id)),
    getDoc(doc(db, 'businesses', id, 'settings', 'general')),
  ])
  const rootData = root.exists() ? root.data() : {}
  const generalData = general.exists() ? general.data() : {}
  const displayName =
    generalData.displayName ||
    generalData.businessName ||
    rootData.displayName ||
    prettyShopName(id)

  return {
    id,
    displayName,
    kind: rootData.kind || 'bakery',
    subscription,
  }
}

async function hydrateSubscription(id) {
  const subscription = await readSubscription(id)
  if (subscription.missing || subscription.awaitingPayment) return subscription
  if (subscription.activeUntil && Number(subscription.activeUntilMs) > 0) return subscription

  const fromPayment = planDatesFromPayment((await listPayments(id))[0], subscription.graceDays)
  if (!fromPayment) return subscription
  return {
    ...subscription,
    paused: true,
    activeUntil: fromPayment.activeUntil,
    activeUntilMs: fromPayment.activeUntilMs,
    addons: { reports: Boolean(subscription.addons?.reports || fromPayment.reports) },
  }
}

export async function listShops() {
  const ids = [appConfig.defaultBusinessId]

  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(getFirestoreDb(), 'businesses'))
      snap.docs.forEach((item) => {
        if (!ids.includes(item.id)) ids.push(item.id)
      })
    } catch {
      // Root collection can be empty even when a shop’s subcollections exist.
    }
  }

  const shops = await Promise.all(ids.map((id) => loadShop(id)))
  return shops.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export async function recordPayment({
  businessId,
  amount,
  days,
  reports,
  displayName,
}) {
  const current = await readSubscription(businessId)
  const activeUntil = extendActiveUntil(current.activeUntil, days)
  const graceDays = current.graceDays ?? DEFAULT_GRACE_DAYS
  const graceEnd = shiftDateKey(activeUntil, graceDays)
  const subscription = {
    paused: false,
    awaitingPayment: false,
    activeUntil,
    activeUntilMs: endOfDayMs(graceEnd),
    graceDays,
    addons: { reports: Boolean(reports) },
    updatedAt: new Date().toISOString(),
  }

  const payment = {
    amount: Number(amount) || 0,
    days: Number(days) || 0,
    reports: Boolean(reports),
    activeUntil,
    paidAt: new Date().toISOString(),
  }

  if (!isFirebaseConfigured()) {
    try {
      localStorage.setItem(demoSubKey(businessId), JSON.stringify(subscription))
      const prev = await listPayments(businessId)
      localStorage.setItem(demoPayKey(businessId), JSON.stringify([{ id: `pay_${Date.now()}`, ...payment }, ...prev]))
    } catch {
      // ignore
    }
    return { subscription, payment }
  }

  const db = getFirestoreDb()
  await setDoc(
    doc(db, 'businesses', businessId),
    {
      businessId,
      displayName: displayName || businessId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  await setDoc(doc(db, 'businesses', businessId, 'settings', 'subscription'), {
    ...subscription,
    updatedAt: serverTimestamp(),
  })
  await addDoc(collection(db, 'businesses', businessId, 'billingPayments'), {
    ...payment,
    createdAt: serverTimestamp(),
  })
  return { subscription, payment }
}

export async function createShop({ businessId, displayName, kind = 'bakery' }) {
  const id = shopIdFromName(businessId || displayName)
  if (!id) throw new Error('Enter a shop name.')
  const name = String(displayName || id).trim()
  const subscription = {
    ...emptySubscription(),
    missing: false,
    paused: false,
    awaitingPayment: true,
    activeUntil: null,
    activeUntilMs: 0,
  }

  if (!isFirebaseConfigured()) {
    try {
      localStorage.setItem(demoSubKey(id), JSON.stringify(subscription))
    } catch {
      // ignore
    }
    return { id, displayName: name, kind, subscription }
  }

  const db = getFirestoreDb()
  await setDoc(
    doc(db, 'businesses', id),
    {
      businessId: id,
      displayName: name,
      kind,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  await setDoc(
    doc(db, 'businesses', id, 'settings', 'general'),
    {
      displayName: name,
      businessName: name,
      currency: 'INR',
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    { merge: true },
  )
  await setDoc(
    doc(db, 'businesses', id, 'settings', 'orderRules'),
    {
      minimumPreorderDays: 3,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryChargeMode: 'manual',
    },
    { merge: true },
  )
  await setDoc(doc(db, 'businesses', id, 'settings', 'subscription'), {
    paused: false,
    awaitingPayment: true,
    activeUntil: null,
    activeUntilMs: 0,
    graceDays: DEFAULT_GRACE_DAYS,
    addons: { reports: false },
    updatedAt: serverTimestamp(),
  })
  return { id, displayName: name, kind, subscription }
}

async function persistSubscription(businessId, subscription) {
  const next = { ...subscription, missing: false }
  if (!isFirebaseConfigured()) {
    try {
      localStorage.setItem(demoSubKey(businessId), JSON.stringify(next))
    } catch {
      // ignore
    }
    return next
  }

  const { missing: _ignored, updatedAt: _updated, ...data } = next
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
  await setDoc(doc(getFirestoreDb(), 'businesses', businessId, 'settings', 'subscription'), {
    ...clean,
    updatedAt: serverTimestamp(),
  })
  return next
}

function heldDates(current) {
  const liveUntil = current.activeUntil || null
  const liveMs = Number(current.activeUntilMs) || 0
  const heldUntil = current.heldActiveUntil || null
  const heldMs = Number(current.heldActiveUntilMs) || 0
  return {
    heldActiveUntil: liveUntil || heldUntil || null,
    heldActiveUntilMs: liveMs > 0 ? liveMs : heldMs,
  }
}

export async function pauseShop(businessId) {
  const current = await readSubscription(businessId)
  const fromPayment = planDatesFromPayment((await listPayments(businessId))[0], current.graceDays)
  const seeded = {
    ...current,
    activeUntil: current.activeUntil || fromPayment?.activeUntil || null,
    activeUntilMs:
      Number(current.activeUntilMs) > 0 ? Number(current.activeUntilMs) : fromPayment?.activeUntilMs || 0,
  }
  const held = heldDates(seeded)
  const subscription = {
    ...seeded,
    ...held,
    missing: false,
    paused: true,
    activeUntil: seeded.activeUntil || held.heldActiveUntil || null,
    activeUntilMs: Number(seeded.activeUntilMs) > 0 ? Number(seeded.activeUntilMs) : held.heldActiveUntilMs,
    updatedAt: new Date().toISOString(),
  }
  return persistSubscription(businessId, subscription)
}

export async function resumeShop(businessId) {
  const current = await readSubscription(businessId)
  const payments = await listPayments(businessId)
  const fromPayment = planDatesFromPayment(payments[0], current.graceDays)
  const held = heldDates(current)

  const activeUntil =
    current.activeUntil || held.heldActiveUntil || fromPayment?.activeUntil || null
  const activeUntilMs =
    Number(current.activeUntilMs) > 0
      ? Number(current.activeUntilMs)
      : held.heldActiveUntilMs > 0
        ? held.heldActiveUntilMs
        : fromPayment?.activeUntilMs || 0

  if (!activeUntil || !activeUntilMs) {
    throw new Error('No paid plan on file to resume. Record a payment first.')
  }

  const subscription = {
    ...current,
    missing: false,
    paused: false,
    awaitingPayment: false,
    activeUntil,
    activeUntilMs,
    heldActiveUntil: activeUntil,
    heldActiveUntilMs: activeUntilMs,
    addons: {
      reports: Boolean(current.addons?.reports ?? fromPayment?.reports),
    },
    updatedAt: new Date().toISOString(),
  }

  return persistSubscription(businessId, subscription)
}

export async function deletePayment(businessId, paymentId) {
  if (!isFirebaseConfigured()) {
    const rows = (await listPayments(businessId)).filter((row) => row.id !== paymentId)
    try {
      localStorage.setItem(demoPayKey(businessId), JSON.stringify(rows))
    } catch {
      // ignore
    }
    return rows
  }

  await deleteDoc(doc(getFirestoreDb(), 'businesses', businessId, 'billingPayments', paymentId))
  return listPayments(businessId)
}

export async function clearShopBilling(businessId) {
  if (!isFirebaseConfigured()) {
    try {
      localStorage.removeItem(demoSubKey(businessId))
      localStorage.removeItem(demoPayKey(businessId))
    } catch {
      // ignore
    }
    return { subscription: { ...emptySubscription(), missing: true }, payments: [] }
  }

  const db = getFirestoreDb()
  const snap = await getDocs(collection(db, 'businesses', businessId, 'billingPayments'))
  await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)))
  await deleteDoc(doc(db, 'businesses', businessId, 'settings', 'subscription'))
  return { subscription: { ...emptySubscription(), missing: true }, payments: [] }
}

const DEMO_ACTIVITY_KEYS = [
  'ck_admin_demo_enquiries_v1',
  'ck_admin_demo_customers_v1',
  'ck_admin_demo_orders_v1',
  'ck_last_enquiry_success',
]

async function deleteCollection(db, businessId, name) {
  const snap = await getDocs(collection(db, 'businesses', businessId, name))
  await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)))
}

/** Wipes jobs, customers, orders, and billing. Keeps menu, settings, and admin login. */
export async function resetShopForGoLive(businessId) {
  if (!isFirebaseConfigured()) {
    try {
      DEMO_ACTIVITY_KEYS.forEach((key) => localStorage.removeItem(key))
      localStorage.removeItem(demoSubKey(businessId))
      localStorage.removeItem(demoPayKey(businessId))
    } catch {
      // ignore
    }
    return { subscription: { ...emptySubscription(), missing: true }, payments: [] }
  }

  const db = getFirestoreDb()
  await Promise.all([
    deleteCollection(db, businessId, 'enquiries'),
    deleteCollection(db, businessId, 'customers'),
    deleteCollection(db, businessId, 'orders'),
    deleteCollection(db, businessId, 'billingPayments'),
    deleteCollection(db, businessId, 'counters'),
  ])
  try {
    await deleteDoc(doc(db, 'businesses', businessId, 'settings', 'subscription'))
  } catch {
    // already gone
  }
  return { subscription: { ...emptySubscription(), missing: true }, payments: [] }
}

export async function isVisifyOperator(uid) {
  if (!uid) return false
  if (!isFirebaseConfigured()) return false
  const snap = await getDoc(doc(getFirestoreDb(), 'visifyOperators', uid))
  return snap.exists()
}
