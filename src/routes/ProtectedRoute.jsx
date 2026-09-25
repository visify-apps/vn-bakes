import { Navigate, useLocation } from 'react-router-dom'
import { openVisifyDesk } from '../config/appConfig'
import { useAuth } from '../context/AuthContext'

/**
 * Guards admin routes. Customers never use this — they have no login.
 */
export function ProtectedRoute({ children }) {
  const { user, adminProfile, isVisify, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-state">
        <p>Checking admin session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  if (!adminProfile) {
    if (isVisify) {
      openVisifyDesk()
      return (
        <div className="page-state">
          <p>Opening Visify desk…</p>
        </div>
      )
    }
    return (
      <div className="page-state">
        <p>
          Signed in, but this account is not an admin for this bakery. Ask Visify to add your UID
          under <code>adminUsers</code>.
        </p>
      </div>
    )
  }

  return children
}
