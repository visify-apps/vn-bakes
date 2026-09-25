import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, House, BriefcaseBusiness, UtensilsCrossed, IndianRupee, Users, Settings, MoreHorizontal } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useAccess } from '../context/AccessContext'
import { useBusiness } from '../context/BusinessContext'
import { ownerPlanMessage } from '../utils/subscription'

const links = [
  { to: '/admin', end: true, label: 'Home', icon: House },
  { to: '/admin/enquiries', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/admin/products', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/money', label: 'Money', icon: IndianRupee },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const mobileTabs = [
  { to: '/admin', end: true, label: 'Home', icon: House },
  { to: '/admin/enquiries', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/admin/products', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/more', label: 'More', icon: MoreHorizontal },
]

export function AdminLayout() {
  const { business } = useBusiness()
  const { access } = useAccess()
  const planNote = ownerPlanMessage(access)
  const { logout, user } = useAuth()
  const location = useLocation()
  const navLinks = [
    ...links.slice(0, 4),
    { to: '/admin/reports', label: 'Reports', icon: BarChart3, addon: true },
    ...links.slice(4),
  ]
  const onDetail =
    /\/enquiries\/[^/]+/.test(location.pathname) ||
    /\/products\/[^/]+/.test(location.pathname) ||
    /\/customers\/[^/]+/.test(location.pathname) ||
    /\/settings$/.test(location.pathname) ||
    /\/reports\/[^/]+/.test(location.pathname)

  return (
    <div className={`admin-shell${onDetail ? ' admin-shell--detail' : ''}`}>
      <aside className="admin-rail" aria-label="Admin navigation">
        <div className="admin-rail__brand">
          <strong>{business.displayName || 'Bakery'}</strong>
          <span>Admin</span>
        </div>

        <nav className="admin-rail__nav">
          {navLinks.map((link) => {
            const Icon = link.icon

            return (
              <NavLink key={link.to} to={link.to} end={link.end} className={link.addon ? 'admin-nav--addon' : undefined}>
                <Icon className="admin-nav-icon" size={18} strokeWidth={2} aria-hidden="true" />
                <span>{link.label}</span>
                {link.addon ? <em>Add-on</em> : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="admin-rail__foot">
          <p className="muted">{user?.email}</p>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar admin-topbar--mobile">
          <div>
            <strong>{business.displayName || 'Bakery'}</strong>
            <span className="admin-topbar__sub">Manage orders</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost admin-signout"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </header>

        <div className="admin-content">
          {planNote && !access.open ? <p className="plan-banner">{planNote}</p> : null}
          <Outlet />
        </div>
      </div>

      {!onDetail ? (
        <nav className="admin-tabbar" aria-label="Admin mobile">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className="admin-tab"
              >
                <Icon className="admin-nav-icon" size={20} strokeWidth={2} aria-hidden="true" />
                <span>{tab.label}</span>
              </NavLink>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}