import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { openVisifyDesk } from '../../config/appConfig'
import { useAuth } from '../../context/AuthContext'

export function AdminLoginPage() {
  const { login, isAdmin, isVisify, loading, demoMode, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(demoMode ? 'baker@demo.local' : '')
  const [password, setPassword] = useState(demoMode ? 'demo1234' : '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isVisify) {
    openVisifyDesk()
    return (
      <div className="page-state">
        <p>Opening Visify desk…</p>
      </div>
    )
  }

  if (!loading && isAdmin) {
    return <Navigate to={location.state?.from?.pathname || '/admin'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await login(email.trim(), password)
      if (result.isVisify) {
        openVisifyDesk()
        return
      }
      if (!result.isAdmin) {
        await logout()
        setError('This account is not a baker admin for this shop.')
        return
      }
      const from = location.state?.from?.pathname
      navigate(from && !from.includes('visify') ? from : '/admin', { replace: true })
    } catch (err) {
      setError(err?.message || 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-login page">
      <h1>Baker login</h1>
      <p className="lede">Sign in to manage enquiries and your menu.</p>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}
