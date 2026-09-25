import { Link } from 'react-router-dom'
import { VisifyNote } from '../../components/VisifyNote'
import { useAccess } from '../../context/AccessContext'
import { useAuth } from '../../context/AuthContext'

export function AdminMorePage() {
  const { user, logout } = useAuth()
  const { access } = useAccess()

  return (
    <section className="page admin-page admin-more">
      <header className="menu-head">
        <div>
          <h1>More</h1>
          <p>{user?.email}</p>
        </div>
      </header>

      <div className="admin-more-list">
        <Link to="/admin/money">Money</Link>
        <Link to="/admin/reports" className="admin-nav--addon">
          Reports
          <em>{access.reports ? 'On' : 'Add-on'}</em>
        </Link>
        <Link to="/admin/customers">Customers</Link>
        <Link to="/admin/settings">Settings</Link>
        <a href="#/" target="_blank" rel="noreferrer">
          Website
        </a>
        <button type="button" onClick={() => logout()}>
          Sign out
        </button>
      </div>
      <VisifyNote />
    </section>
  )
}
