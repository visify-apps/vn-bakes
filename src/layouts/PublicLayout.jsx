import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CakeSlice, Gift, House, Cookie, MessageCircle } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext'
import { useAccess } from '../context/AccessContext'
import { generateWhatsAppLink } from '../services/whatsapp'

export function PublicLayout() {
  const { business } = useBusiness()
  const { pathname } = useLocation()
  const focused =
    pathname.startsWith('/custom-cake') || pathname.startsWith('/products/')
  const { access } = useAccess()
  const phone = business.whatsappNumber || business.phone
  const wa = phone
    ? generateWhatsAppLink(
        phone,
        `Hi ${business.displayName || 'VN Bakes'}, I'd like to ask about an order.`,
      )
    : null
  const brand = business.displayName || business.businessName || 'VN Bakes'

  const tabs = [
    { to: '/', end: true, label: 'Home', icon: House },
    { to: '/menu', label: 'Cakes', icon: CakeSlice },
    { to: '/brownies', label: 'Brownies', icon: Cookie },
    { to: '/gifts', label: 'Gifts', icon: Gift },
  ]
  if (access.open) {
    tabs.push({ to: '/custom-cake', label: 'Enquire', icon: MessageCircle })
  } else if (wa && wa !== '#') {
    tabs.push({ href: wa, label: 'WhatsApp', icon: MessageCircle, external: true })
  }

  return (
    <div className={`site${focused ? ' site--focus' : ''}`}>
      <header className="site-header">
        <NavLink to="/" className="site-logo" title={brand}>
          {brand}
        </NavLink>
        <nav className="site-nav site-nav--desktop" aria-label="Primary">
          <NavLink to="/menu">Cakes</NavLink>
          <NavLink to="/brownies">Brownies</NavLink>
          <NavLink to="/gifts">Gifts</NavLink>
          {access.open ? <NavLink to="/custom-cake">Enquire</NavLink> : null}
          {wa && wa !== '#' ? (
            <a href={wa} target="_blank" rel="noreferrer" className="site-nav__wa">
              WhatsApp
            </a>
          ) : null}
        </nav>
        {wa && wa !== '#' ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="site-header__wa"
            aria-label="WhatsApp"
          >
            WA
          </a>
        ) : null}
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      {!focused ? (
        <footer className="site-footer">
          <p>
            {business.instagramHandle || business.instagramUrl ? (
              <a
                href={
                  business.instagramUrl ||
                  `https://www.instagram.com/${String(business.instagramHandle).replace(/^@/, '')}/`
                }
                target="_blank"
                rel="noreferrer"
              >
                @
                {String(business.instagramHandle || 'vn__bakes__')
                  .replace(/^@/, '')
                  .replace(/.*instagram\.com\//, '')
                  .replace(/\/.*/, '')}
              </a>
            ) : (
              `${business.minimumPreorderDays || 2} days preorder · Red Hills / Korattur`
            )}
          </p>
        </footer>
      ) : null}

      {!focused ? (
        <nav className="site-tabbar" aria-label="Shop">
          {tabs.map((tab) => {
            const Icon = tab.icon
            if (tab.external) {
              return (
                <a
                  key={tab.label}
                  href={tab.href}
                  target="_blank"
                  rel="noreferrer"
                  className="site-tab"
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  <span>{tab.label}</span>
                </a>
              )
            }
            return (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className="site-tab">
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
                <span>{tab.label}</span>
              </NavLink>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}
