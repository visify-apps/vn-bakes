import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { appConfig } from '../config/appConfig'
import { readSubscription } from '../services/firestore/subscription'
import { describeAccess } from '../utils/subscription'

const AccessContext = createContext(null)

export function AccessProvider({ children }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const next = await readSubscription(appConfig.defaultBusinessId)
    setSubscription(next)
    return next
  }

  useEffect(() => {
    let cancelled = false
    readSubscription(appConfig.defaultBusinessId)
      .then((next) => {
        if (!cancelled) setSubscription(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const access = useMemo(() => describeAccess(subscription), [subscription])

  const value = useMemo(
    () => ({ subscription, access, loading, reload }),
    [subscription, access, loading],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess() {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used within AccessProvider')
  return ctx
}
