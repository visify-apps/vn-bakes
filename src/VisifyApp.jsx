import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AccessProvider } from './context/AccessContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { VisifyRoute } from './routes/VisifyRoute'
import { VisifyDeskPage } from './pages/visify/VisifyDeskPage'

/** Same login screen shape as the old shop /#/admin/login Visify path. */
function VisifyLoginPage() {
  const { login, isVisify, loading, demoMode, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(demoMode ? 'visifyapps@gmail.com' : '')
  const [password, setPassword] = useState(demoMode ? 'demo1234' : '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isVisify) {
    return <Navigate to="/visify" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await login(email.trim(), password)
      if (!result.isVisify) {
        await logout()
        setError('This login is for Visify only. Shop bakers use their own bakery site.')
        return
      }
      navigate('/visify', { replace: true })
    } catch (err) {
      setError(err?.message || 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-login page">
      <h1>Visify login</h1>
      <p className="lede">Sign in with visifyapps@gmail.com to open the desk.</p>
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

/**
 * Standalone Visify desk — same UI/routes as the old shop /#/visify,
 * but hosted on its own Pages site (never on a bakery URL).
 */
export function VisifyApp() {
  return (
    <AuthProvider>
      <AccessProvider>
        <HashRouter>
          <Routes>
            <Route path="admin/login" element={<VisifyLoginPage />} />
            <Route path="login" element={<Navigate to="/admin/login" replace />} />
            <Route
              path="visify"
              element={
                <VisifyRoute>
                  <VisifyDeskPage />
                </VisifyRoute>
              }
            />
            <Route path="/" element={<Navigate to="/visify" replace />} />
            <Route path="*" element={<Navigate to="/visify" replace />} />
          </Routes>
        </HashRouter>
      </AccessProvider>
    </AuthProvider>
  )
}
