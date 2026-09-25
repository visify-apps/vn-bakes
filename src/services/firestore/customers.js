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
import { demoCustomers } from '../../data/demoCustomers'

const DEMO_KEY = 'ck_admin_demo_customers_v1'

function cloneDemo() {
  return demoCustomers.map((c) => ({ ...c, tags: [...(c.tags || [])] }))
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

export function customerIdFromPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return `phone_${digits}`
}

export function enquiryMatchesCustomer(enquiry, customer) {
  if (!enquiry || !customer) return false
  if (enquiry.customerId && enquiry.customerId === customer.id) return true
  const phone = enquiry.customerSnapshot?.phone
  return phone ? customerIdFromPhone(phone) === customer.id : false
}

function normalize(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
    lastEnquiryAt: data.lastEnquiryAt?.toDate?.()?.toISOString?.() || data.lastEnquiryAt || null,
    lastOrderAt: data.lastOrderAt?.toDate?.()?.toISOString?.() || data.lastOrderAt || null,
  }
}

export async function listCustomers(businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    return readDemo().sort((a, b) => String(b.lastEnquiryAt || '').localeCompare(String(a.lastEnquiryAt || '')))
  }

  try {
    const db = getFirestoreDb()
    const snap = await getDocs(
      query(collection(db, 'businesses', businessId, 'customers'), orderBy('lastEnquiryAt', 'desc')),
    )
    return snap.docs.map((d) => normalize(d.id, d.data()))
  } catch {
    return []
  }
}

export async function getCustomer(customerId, businessId = appConfig.defaultBusinessId) {
  if (!customerId) return null
  if (!isFirebaseConfigured()) {
    return readDemo().find((c) => c.id === customerId) || null
  }
  try {
    const snap = await getDoc(doc(getFirestoreDb(), 'businesses', businessId, 'customers', customerId))
    if (snap.exists()) return normalize(snap.id, snap.data())
    return null
  } catch {
    return null
  }
}

/**
 * Admin-side upsert when processing an enquiry (secure path — no public customer writes).
 */
export async function upsertCustomerFromEnquiry(enquiry, businessId = appConfig.defaultBusinessId) {
  const phone = enquiry?.customerSnapshot?.phone
  if (!phone) throw new Error('Enquiry has no customer phone.')

  const customerId = customerIdFromPhone(phone)
  const nowIso = new Date().toISOString()
  const name = enquiry.customerSnapshot.name || 'Customer'
  const email = enquiry.customerSnapshot.email || null

  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const idx = items.findIndex((c) => c.id === customerId)
    if (idx === -1) {
      const created = {
        id: customerId,
        businessId,
        name,
        phone,
        email,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastEnquiryAt: enquiry.createdAt || nowIso,
        lastOrderAt: null,
        totalEnquiries: 1,
        totalOrders: 0,
        totalSpend: 0,
        tags: [],
      }
      items.unshift(created)
      writeDemo(items)
      return created
    }
    const existing = items[idx]
    const next = {
      ...existing,
      name: name || existing.name,
      email: email ?? existing.email,
      updatedAt: nowIso,
      lastEnquiryAt: enquiry.createdAt || nowIso,
      totalEnquiries: (existing.totalEnquiries || 0) + (enquiry.customerId === customerId ? 0 : 0),
    }
    // Increment only if enquiry not yet linked
    if (enquiry.customerId !== customerId) {
      next.totalEnquiries = (existing.totalEnquiries || 0) + 1
    }
    items[idx] = next
    writeDemo(items)
    return next
  }

  const db = getFirestoreDb()
  const ref = doc(db, 'businesses', businessId, 'customers', customerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      businessId,
      name,
      phone,
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastEnquiryAt: serverTimestamp(),
      lastOrderAt: null,
      totalEnquiries: 1,
      totalOrders: 0,
      totalSpend: 0,
      tags: [],
    })
  } else {
    const data = snap.data()
    await updateDoc(ref, {
      name: name || data.name,
      email: email ?? data.email,
      updatedAt: serverTimestamp(),
      lastEnquiryAt: serverTimestamp(),
      totalEnquiries: (data.totalEnquiries || 0) + (enquiry.customerId ? 0 : 1),
    })
  }
  return getCustomer(customerId, businessId)
}

export async function updateCustomer(customerId, patch, businessId = appConfig.defaultBusinessId) {
  if (!customerId) throw new Error('Customer required')
  const body = {
    notes: patch.notes ?? '',
    updatedAt: new Date().toISOString(),
  }

  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const idx = items.findIndex((c) => c.id === customerId)
    if (idx === -1) throw new Error('Customer not found')
    items[idx] = { ...items[idx], ...body }
    writeDemo(items)
    return items[idx]
  }

  await updateDoc(doc(getFirestoreDb(), 'businesses', businessId, 'customers', customerId), {
    notes: patch.notes ?? '',
    updatedAt: serverTimestamp(),
  })
  return getCustomer(customerId, businessId)
}

export async function recordCustomerOrder(customerId, spendAmount, businessId = appConfig.defaultBusinessId) {
  const nowIso = new Date().toISOString()
  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const idx = items.findIndex((c) => c.id === customerId)
    if (idx === -1) return null
    items[idx] = {
      ...items[idx],
      totalOrders: (items[idx].totalOrders || 0) + 1,
      totalSpend: (items[idx].totalSpend || 0) + (Number(spendAmount) || 0),
      lastOrderAt: nowIso,
      updatedAt: nowIso,
    }
    writeDemo(items)
    return items[idx]
  }

  const ref = doc(getFirestoreDb(), 'businesses', businessId, 'customers', customerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  await updateDoc(ref, {
    totalOrders: (data.totalOrders || 0) + 1,
    totalSpend: (data.totalSpend || 0) + (Number(spendAmount) || 0),
    lastOrderAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return getCustomer(customerId, businessId)
}
