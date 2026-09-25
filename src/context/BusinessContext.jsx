import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../config/appConfig'
import { getFirestoreDb } from '../services/firebase'
import { readDemoBusiness, saveBusinessSettings } from '../services/firestore/businessSettings'

const BusinessContext = createContext(null)

const fallbackBusiness = {
  businessId: appConfig.defaultBusinessId,
  businessName: '',
  displayName: '',
  description: '',
  whatsappNumber: '',
  phone: '',
  whatsappGreetingName: '',
  pickupAvailable: true,
  deliveryAvailable: true,
  minimumPreorderDays: 3,
  currency: 'INR',
  kind: '',
  instagramHandle: '',
  instagramUrl: '',
  loadedFromFirestore: false,
}

export function BusinessProvider({ children }) {
  const [business, setBusiness] = useState(fallbackBusiness)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isFirebaseConfigured()) {
        const demo = readDemoBusiness()
        if (demo) {
          setBusiness((prev) => ({ ...prev, ...demo }))
        }
        setLoading(false)
        return
      }

      try {
        const db = getFirestoreDb()
        const businessId = appConfig.defaultBusinessId
        const [rootSnap, generalSnap, rulesSnap] = await Promise.all([
          getDoc(doc(db, 'businesses', businessId)),
          getDoc(doc(db, 'businesses', businessId, 'settings', 'general')),
          getDoc(doc(db, 'businesses', businessId, 'settings', 'orderRules')),
        ])

        if (cancelled) return

        const root = rootSnap.exists() ? rootSnap.data() : {}
        const general = generalSnap.exists() ? generalSnap.data() : {}
        const rules = rulesSnap.exists() ? rulesSnap.data() : {}

        setBusiness({
          ...fallbackBusiness,
          ...general,
          kind: root.kind || general.kind || '',
          businessId,
          minimumPreorderDays: rules.minimumPreorderDays ?? fallbackBusiness.minimumPreorderDays,
          pickupAvailable: rules.pickupEnabled ?? general.pickupAvailable ?? true,
          deliveryAvailable: rules.deliveryEnabled ?? general.deliveryAvailable ?? true,
          loadedFromFirestore: generalSnap.exists(),
        })
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setBusiness(fallbackBusiness)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const title = business.displayName || business.businessName
    document.title = title || 'Shop'
  }, [business.displayName, business.businessName])

  const saveBusiness = useCallback(async (patch) => {
    const saved = await saveBusinessSettings(patch, business.businessId)
    setBusiness((prev) => ({ ...prev, ...saved }))
    return saved
  }, [business.businessId])

  const value = useMemo(
    () => ({ business, loading, error, saveBusiness }),
    [business, loading, error, saveBusiness],
  )

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  )
}

export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider')
  return ctx
}
