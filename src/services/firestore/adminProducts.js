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
import { seedProducts } from '../../data/seedCatalogue'

const DEMO_KEY = 'ck_admin_demo_products_v1'

function cloneSeed() {
  return seedProducts.map((p) => ({ ...p, imageUrls: [...(p.imageUrls || [])] }))
}

function readDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (!raw) {
      const seed = cloneSeed()
      localStorage.setItem(DEMO_KEY, JSON.stringify(seed))
      return seed
    }
    return JSON.parse(raw)
  } catch {
    return cloneSeed()
  }
}

function writeDemo(items) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export async function listAdminProducts(businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    return readDemo().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  }
  try {
    const snap = await getDocs(
      query(collection(getFirestoreDb(), 'businesses', businessId, 'products'), orderBy('displayOrder', 'asc')),
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

export async function getAdminProduct(productId, businessId = appConfig.defaultBusinessId) {
  if (!productId) return null
  if (!isFirebaseConfigured()) {
    return readDemo().find((p) => p.id === productId) || null
  }
  try {
    const snap = await getDoc(doc(getFirestoreDb(), 'businesses', businessId, 'products', productId))
    if (snap.exists()) return { id: snap.id, ...snap.data() }
    return null
  } catch {
    return null
  }
}

export async function saveProduct(product, businessId = appConfig.defaultBusinessId) {
  const id = product.id || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const body = {
    businessId,
    name: product.name,
    categoryId: product.categoryId,
    description: product.description || '',
    imageUrls: product.imageUrls || [],
    basePrice: product.basePrice === '' || product.basePrice == null ? null : Number(product.basePrice),
    priceType: product.priceType || 'enquiry',
    minimumQuantity:
      product.minimumQuantity === '' || product.minimumQuantity == null
        ? null
        : Number(product.minimumQuantity),
    available: product.available !== false,
    requiresCustomEnquiry: Boolean(product.requiresCustomEnquiry),
    customFields: product.customFields || [],
    displayOrder: Number(product.displayOrder) || 0,
  }

  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const idx = items.findIndex((p) => p.id === id)
    const next = { ...body, id, updatedAt: new Date().toISOString() }
    if (idx === -1) items.push({ ...next, createdAt: new Date().toISOString() })
    else items[idx] = { ...items[idx], ...next }
    writeDemo(items)
    return next
  }

  const ref = doc(getFirestoreDb(), 'businesses', businessId, 'products', id)
  await setDoc(
    ref,
    {
      ...body,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
  return { id, ...body }
}

export async function setProductAvailability(productId, available, businessId = appConfig.defaultBusinessId) {
  if (!isFirebaseConfigured()) {
    const items = readDemo()
    const idx = items.findIndex((p) => p.id === productId)
    if (idx === -1) throw new Error('Product not found')
    items[idx] = { ...items[idx], available, updatedAt: new Date().toISOString() }
    writeDemo(items)
    return items[idx]
  }
  await updateDoc(doc(getFirestoreDb(), 'businesses', businessId, 'products', productId), {
    available,
    updatedAt: serverTimestamp(),
  })
  return { id: productId, available }
}
