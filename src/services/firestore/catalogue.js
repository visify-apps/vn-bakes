import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'
import { getFirestoreDb } from '../firebase'
import { seedCategories, seedProducts } from '../../data/seedCatalogue'

function businessPath(businessId = appConfig.defaultBusinessId) {
  return ['businesses', businessId]
}

function sortByDisplayOrder(items) {
  return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
}

/** Cake categories only (not brownies / chocolates / bouquets). */
export const CAKE_CATEGORY_IDS = new Set(['custom-cakes', 'theme-cakes', 'wedding-fondant', 'fresh-cream'])

export const BROWNIE_CATEGORY_ID = 'brownies'
export const GIFT_CATEGORY_IDS = new Set(['chocolates', 'bouquets'])

export function isCakeCategory(categoryId) {
  return CAKE_CATEGORY_IDS.has(String(categoryId || ''))
}

export function isBrownieCategory(categoryId) {
  return String(categoryId || '') === BROWNIE_CATEGORY_ID
}

export function isGiftCategory(categoryId) {
  return GIFT_CATEGORY_IDS.has(String(categoryId || ''))
}

/**
 * @param {string} [businessId]
 * @param {{ categoryId?: string, cakeOnly?: boolean, brownieOnly?: boolean, giftOnly?: boolean }} [options]
 */
export async function listProducts(businessId = appConfig.defaultBusinessId, options = {}) {
  const { categoryId, cakeOnly = false, brownieOnly = false, giftOnly = false } = options

  const applyKind = (items) => {
    let next = items
    if (categoryId) next = next.filter((p) => p.categoryId === categoryId)
    if (cakeOnly) next = next.filter((p) => isCakeCategory(p.categoryId))
    else if (brownieOnly) next = next.filter((p) => isBrownieCategory(p.categoryId))
    else if (giftOnly) next = next.filter((p) => isGiftCategory(p.categoryId))
    return sortByDisplayOrder(next)
  }

  const fromSeed = () => {
    let local = seedProducts
    try {
      const raw = localStorage.getItem('ck_admin_demo_products_v1')
      if (raw) local = JSON.parse(raw)
    } catch {
      // ignore
    }
    return applyKind(local.filter((p) => p.available !== false))
  }

  if (!isFirebaseConfigured()) return fromSeed()

  try {
    const db = getFirestoreDb()
    const ref = collection(db, ...businessPath(businessId), 'products')
    const constraints = [where('available', '==', true)]
    if (categoryId) constraints.unshift(where('categoryId', '==', categoryId))
    const snap = await getDocs(query(ref, ...constraints, orderBy('displayOrder', 'asc')))
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return applyKind(items)
  } catch {
    return []
  }
}

/**
 * @param {string} [businessId]
 * @param {{ cakeOnly?: boolean, brownieOnly?: boolean, giftOnly?: boolean }} [options]
 */
export async function listCategories(businessId = appConfig.defaultBusinessId, options = {}) {
  const { cakeOnly = false, brownieOnly = false, giftOnly = false } = options
  const filterKind = (items) => {
    if (cakeOnly) return items.filter((c) => isCakeCategory(c.id))
    if (brownieOnly) return items.filter((c) => isBrownieCategory(c.id))
    if (giftOnly) return items.filter((c) => isGiftCategory(c.id))
    return items
  }

  if (!isFirebaseConfigured()) {
    return sortByDisplayOrder(filterKind(seedCategories.filter((c) => c.available !== false)))
  }

  try {
    const db = getFirestoreDb()
    const ref = collection(db, ...businessPath(businessId), 'categories')
    const snap = await getDocs(query(ref, orderBy('displayOrder', 'asc')))
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return sortByDisplayOrder(filterKind(items.filter((c) => c.available !== false)))
  } catch {
    return []
  }
}

/**
 * @param {string} productId
 * @param {string} [businessId]
 */
export async function getProduct(productId, businessId = appConfig.defaultBusinessId) {
  if (!productId) return null

  const fromLocal = () => {
    try {
      const raw = localStorage.getItem('ck_admin_demo_products_v1')
      if (raw) {
        const local = JSON.parse(raw)
        const found = local.find((p) => p.id === productId)
        if (found) return found
      }
    } catch {
      // ignore
    }
    return seedProducts.find((p) => p.id === productId) || null
  }

  if (!isFirebaseConfigured()) {
    return fromLocal()
  }

  try {
    const db = getFirestoreDb()
    const snap = await getDoc(doc(db, ...businessPath(businessId), 'products', productId))
    if (snap.exists()) return { id: snap.id, ...snap.data() }
    return null
  } catch {
    return null
  }
}

export function getCategoryName(categories, categoryId) {
  return categories.find((c) => c.id === categoryId)?.name || categoryId || '—'
}
