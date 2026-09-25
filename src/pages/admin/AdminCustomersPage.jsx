import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { listCustomers, enquiryMatchesCustomer } from '../../services/firestore/customers'
import { listEnquiries } from '../../services/firestore/adminEnquiries'
import { generateWhatsAppLink } from '../../services/whatsapp'
import { formatPrice } from '../../utils/pricing'
import { amountDue } from '../../utils/moneyLists'
import { sortByDeliveryDate } from '../../utils/jobDate'

function lastJob(jobs) {
  if (!jobs.length) return null
  return [...jobs].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0]
}

function enrich(customers, enquiries) {
  return customers.map((customer) => {
    const jobs = sortByDeliveryDate(enquiries.filter((e) => enquiryMatchesCustomer(e, customer)))
    const last = lastJob(jobs)
    return {
      customer,
      jobs,
      last,
      owing: jobs.some((e) => amountDue(e) > 0),
      repeat: (customer.totalOrders || 0) >= 1 || jobs.length >= 2,
    }
  })
}

export function AdminCustomersPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([listCustomers(), listEnquiries()])
      .then(([customers, enquiries]) => {
        if (!cancelled) setRows(enrich(customers, enquiries))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === 'repeat' && !row.repeat) return false
      if (filter === 'new' && row.repeat) return false
      if (filter === 'owing' && !row.owing) return false
      if (!q) return true
      const hay = [row.customer.name, row.customer.phone, row.last?.productName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, filter])

  const owingCount = rows.filter((r) => r.owing).length

  return (
    <section className="page admin-page admin-customers">
      <header className="menu-head">
        <div>
          <h1>Customers</h1>
          <p>{loading ? '…' : `${rows.length}`}</p>
        </div>
      </header>

      <div className="jobs-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="menu-cats" role="tablist" aria-label="Customers">
        <button
          type="button"
          className={`quick-filter${!filter ? ' is-active' : ''}`}
          onClick={() => setFilter('')}
        >
          All
        </button>
        <button
          type="button"
          className={`quick-filter${filter === 'repeat' ? ' is-active' : ''}`}
          onClick={() => setFilter('repeat')}
        >
          Repeat
        </button>
        <button
          type="button"
          className={`quick-filter${filter === 'new' ? ' is-active' : ''}`}
          onClick={() => setFilter('new')}
        >
          New
        </button>
        {owingCount ? (
          <button
            type="button"
            className={`quick-filter${filter === 'owing' ? ' is-active' : ''}`}
            onClick={() => setFilter('owing')}
          >
            Owing
          </button>
        ) : null}
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && !filtered.length ? <p className="muted">Nobody here.</p> : null}

      <div className="home-stack">
        {filtered.map(({ customer, last, owing }) => {
          const wa = generateWhatsAppLink(customer.phone, `Hi ${customer.name?.split(' ')[0] || ''}…`)
          return (
            <article key={customer.id} className={`home-row${owing ? ' home-row--soon' : ''}`}>
              <Link to={`/admin/customers/${customer.id}`} className="home-row__main">
                <strong>{customer.name}</strong>
                <p>{last?.productName || customer.phone}</p>
              </Link>
              <span className="home-row__when">{formatPrice(customer.totalSpend) || '₹0'}</span>
              {wa && wa !== '#' ? (
                <a className="home-row__wa" href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                  <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
