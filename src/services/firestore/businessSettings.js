import { doc, setDoc } from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'
import { getFirestoreDb } from '../firebase'

const DEMO_KEY = 'ck_admin_demo_business_v1'

export function readDemoBusiness() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function saveBusinessSettings(patch, businessId = appConfig.defaultBusinessId) {
  const general = {
    displayName: patch.displayName,
    businessName: patch.displayName,
    whatsappNumber: patch.whatsappNumber || '',
    phone: patch.whatsappNumber || patch.phone || '',
  }
  const rules = {
    minimumPreorderDays: Number(patch.minimumPreorderDays) || 3,
  }

  if (!isFirebaseConfigured()) {
    const next = { ...readDemoBusiness(), ...general, ...rules }
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    return next
  }

  const db = getFirestoreDb()
  await Promise.all([
    setDoc(doc(db, 'businesses', businessId, 'settings', 'general'), general, { merge: true }),
    setDoc(doc(db, 'businesses', businessId, 'settings', 'orderRules'), rules, { merge: true }),
  ])
  return { ...general, ...rules }
}
