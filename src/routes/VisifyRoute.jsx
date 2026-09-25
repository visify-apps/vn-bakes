import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Gate for the standalone Visify desk — same behavior as when it lived on the shop app. */
export function VisifyRoute({ children }) {
  const { user, isVisify, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="page-state">
        <p>Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  if (!isVisify) {
    return (
      <section className="page admin-login">
        <h1>Visify desk</h1>
        <p className="lede">
          You’re signed in as {user.email}. That’s the baker login. Sign out, then sign in with
          visifyapps@gmail.com.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            await logout()
            navigate('/admin/login', { replace: true, state: { from: location } })
          }}
        >
          Sign out
        </button>
      </section>
    )
  }

  return children
}
