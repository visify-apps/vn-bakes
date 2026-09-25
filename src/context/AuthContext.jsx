import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../config/appConfig'
import {
  getFirebaseAuth,
  getFirestoreDb,
} from '../services/firebase'
import { isVisifyOperator } from '../services/firestore/subscription'

const AuthContext = createContext(null)
const DEMO_ADMIN_KEY = 'ck_demo_admin_session'

function demoVisify(email) {
  return String(email || '').trim().toLowerCase() === 'visifyapps@gmail.com'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [isVisify, setIsVisify] = useState(false)
  const [loading, setLoading] = useState(true)
  const [configReady] = useState(() => isFirebaseConfigured())

  useEffect(() => {
    if (!configReady) {
      try {
        if (sessionStorage.getItem(DEMO_ADMIN_KEY) === '1') {
          const email = sessionStorage.getItem('ck_demo_admin_email') || 'demo-admin@local.dev'
          setUser({ email, uid: 'demo-admin' })
          setIsVisify(demoVisify(email))
          if (!demoVisify(email)) {
            setAdminProfile({
              id: 'demo-admin',
              businessId: appConfig.defaultBusinessId,
              role: 'owner',
              email,
              demo: true,
            })
          }
        }
      } catch {
        // ignore
      }
      setLoading(false)
      return undefined
    }

    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setAdminProfile(null)
        setIsVisify(false)
        setLoading(false)
        return
      }

      try {
        const businessId = appConfig.defaultBusinessId
        const [adminSnap, visify] = await Promise.all([
          getDoc(doc(getFirestoreDb(), 'businesses', businessId, 'adminUsers', nextUser.uid)),
          isVisifyOperator(nextUser.uid),
        ])
        setAdminProfile(adminSnap.exists() ? { id: adminSnap.id, ...adminSnap.data() } : null)
        setIsVisify(visify || demoVisify(nextUser.email))
      } catch {
        setAdminProfile(null)
        setIsVisify(demoVisify(nextUser.email))
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [configReady])

  const value = useMemo(
    () => ({
      user,
      adminProfile,
      loading,
      isAdmin: Boolean(user && adminProfile),
      isVisify: Boolean(user && isVisify),
      firebaseReady: configReady,
      demoMode: !configReady,
      async login(email, password) {
        if (!configReady) {
          if (email.trim() && password.length >= 4) {
            const visify = demoVisify(email)
            const demoUser = { email: email.trim(), uid: visify ? 'demo-visify' : 'demo-admin' }
            try {
              sessionStorage.setItem(DEMO_ADMIN_KEY, '1')
              sessionStorage.setItem('ck_demo_admin_email', email.trim())
            } catch {
              // ignore
            }
            setUser(demoUser)
            setIsVisify(visify)
            setAdminProfile(
              visify
                ? null
                : {
                    id: 'demo-admin',
                    businessId: appConfig.defaultBusinessId,
                    role: 'owner',
                    email: email.trim(),
                    demo: true,
                  },
            )
            return { user: demoUser, isVisify: visify, isAdmin: !visify }
          }
          throw new Error('Demo login: enter any email and a password (4+ characters).')
        }
        const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
        const visify =
          (await isVisifyOperator(credential.user.uid)) || demoVisify(credential.user.email)
        const adminSnap = await getDoc(
          doc(getFirestoreDb(), 'businesses', appConfig.defaultBusinessId, 'adminUsers', credential.user.uid),
        )
        const isAdmin = adminSnap.exists()
        setIsVisify(visify)
        setAdminProfile(isAdmin ? { id: adminSnap.id, ...adminSnap.data() } : null)
        setUser(credential.user)
        return { user: credential.user, isVisify: visify, isAdmin }
      },
      async logout() {
        if (!configReady) {
          try {
            sessionStorage.removeItem(DEMO_ADMIN_KEY)
            sessionStorage.removeItem('ck_demo_admin_email')
          } catch {
            // ignore
          }
          setUser(null)
          setAdminProfile(null)
          setIsVisify(false)
          return
        }
        await signOut(getFirebaseAuth())
      },
    }),
    [user, adminProfile, isVisify, loading, configReady],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
