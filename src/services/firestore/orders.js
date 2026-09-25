import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'
import { getFirestoreDb } from '../firebase'
import { demoOrders } from '../../data/demoOrders'
import { updateEnquiry } from './adminEnquiries'
import { customerIdFromPhone, recordCustomerOrder, upsertCustomerFromEnquiry } from './customers'
import { buildEnquiryNumber } from '../../utils/enquiryNumber'

const DEMO_KEY = 'ck_admin_demo_orders_v1'

function cloneDemo() {
  return demoOrders.map((o) => ({
    ...o,
    customerSnapshot: o.customerSnapshot ? { ...o.customerSnapshot } : null,
  }))
}

function readDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (!raw) {
      const seed = cloneDemo()
      localStorage.setItem(DEMO_KEY, JSON.stringify(seed))
      return seed
    }
    return JSON.parse(raw)
  } catch {
    return cloneDemo()
  }
}

function writeDemo(items) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

function normalize(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
    orderDate: data.orderDate?.toDate?.()?.toISOString?.() || data.orderDate || null,
    deliveryDate: data.deliveryDate?.toDate?.()?.toISOString?.() || data.deliveryDate || null,
  }
}

function createOrderId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  }
  return `ord_${Date.now()}`
}

export async function listOrders(businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    return readDemo().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }
  try {
    const snap = await getDocs(
      query(collection(getFirestoreDb(), 'businesses', businessId, 'orders'), orderBy('createdAt', 'desc')),
    )
    return snap.docs.map((d) => normalize(d.id, d.data()))
  } catch {
    return []
  }
}

export async function getOrder(orderId, businessId = appConfig.defaultBusinessId) {
  if (!orderId) return null
  if (!isFirebaseConfigured()) {
    return readDemo().find((o) => o.id === orderId) || null
  }
  try {
    const snap = await getDoc(doc(getFirestoreDb(), 'businesses', businessId, 'orders', orderId))
    if (snap.exists()) return normalize(snap.id, snap.data())
    return null
  } catch {
    return null
  }
}

export async function updateOrder(orderId, patch, businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const idx = items.findIndex((o) => o.id === orderId)
    if (idx === -1) throw new Error('Order not found')
    items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() }
    writeDemo(items)
    return items[idx]
  }
  await updateDoc(doc(getFirestoreDb(), 'businesses', businessId, 'orders', orderId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
  return getOrder(orderId, businessId)
}

/**
 * Convert an accepted enquiry into an order (separate entities).
 */
export async function createOrderFromEnquiry(enquiry, businessId = appConfig.defaultBusinessId) {
  if (!enquiry) throw new Error('Enquiry required')
  if (enquiry.orderId) {
    const existing = await getOrder(enquiry.orderId, businessId)
    if (existing) return existing
  }

  const customer = await upsertCustomerFromEnquiry(enquiry, businessId)
  const orderId = createOrderId()
  const orderNumber = `ORD-${buildEnquiryNumber(orderId).replace(/^BB-/, '')}`
  const quotedPrice = Number(enquiry.quotedPrice) || 0
  const advanceAmount = Number(enquiry.advanceRequired) || 0
  const balanceAmount =
    enquiry.balanceAmount != null
      ? Number(enquiry.balanceAmount)
      : Math.max(quotedPrice - advanceAmount, 0)

  const orderBody = {
    businessId,
    enquiryId: enquiry.id,
    enquiryNumber: enquiry.enquiryNumber,
    customerId: customer.id,
    orderNumber,
    orderDate: new Date().toISOString(),
    deliveryDate: enquiry.preferredDate || null,
    status: enquiry.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED',
    quotedPrice,
    advanceAmount,
    balanceAmount,
    paymentStatus:
      advanceAmount > 0 && balanceAmount > 0
        ? 'PARTIALLY_PAID'
        : advanceAmount > 0 && balanceAmount === 0
          ? 'PAID'
          : 'ADVANCE_PENDING',
    fulfillmentType: enquiry.fulfillmentType || 'pickup',
    customerSnapshot: {
      name: enquiry.customerSnapshot?.name || customer.name,
      phone: enquiry.customerSnapshot?.phone || customer.phone,
    },
  }

  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const created = {
      id: orderId,
      ...orderBody,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.unshift(created)
    writeDemo(items)
    await updateEnquiry(enquiry.id, {
      orderId,
      customerId: customer.id,
      status: enquiry.status === 'NEW' || enquiry.status === 'QUOTE_SENT' ? 'CONFIRMED' : enquiry.status,
    }, businessId)
    await recordCustomerOrder(customer.id, quotedPrice, businessId)
    return created
  }

  const db = getFirestoreDb()
  await setDoc(doc(db, 'businesses', businessId, 'orders', orderId), {
    ...orderBody,
    orderDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateEnquiry(enquiry.id, {
    orderId,
    customerId: customer.id,
    status: enquiry.status === 'NEW' || enquiry.status === 'QUOTE_SENT' ? 'CONFIRMED' : enquiry.status,
  }, businessId)
  await recordCustomerOrder(customer.id, quotedPrice, businessId)
  return getOrder(orderId, businessId)
}

export { customerIdFromPhone }
