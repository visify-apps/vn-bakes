import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEnquiries } from '../../services/firestore/adminEnquiries'
import { formatPrice } from '../../utils/pricing'
import { amountDue, buildMoneyLists } from '../../utils/moneyLists'

export function AdminMoneyPage() {
  const [lists, setLists] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    listEnquiries()
      .then((items) => {
        if (!cancelled) setLists(buildMoneyLists(items))
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
    const items = lists?.due || []
    if (!q) return items
    return items.filter((e) =>
      [e.enquiryNumber, e.customerSnapshot?.name, e.customerSnapshot?.phone, e.productName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [lists, search])

  return (
    <section className="page admin-page admin-money">
      <header className="menu-head">
        <div>
          <h1>Money</h1>
          <p>{loading ? '…' : formatPrice(lists?.dueTotal) || '₹0'}</p>
        </div>
      </header>

      <div className="jobs-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && !filtered.length ? <p className="muted">Nothing to collect.</p> : null}

      <div className="home-stack">
        {filtered.map((enquiry) => (
          <article key={enquiry.id} className="home-row home-row--soon">
            <Link
              to={`/admin/enquiries/${enquiry.id}`}
              state={{ from: '/admin/money' }}
              className="home-row__main"
            >
              <strong>{enquiry.customerSnapshot?.name || 'Customer'}</strong>
              <p>
                {enquiry.enquiryNumber}
                {enquiry.productName ? ` · ${enquiry.productName}` : ''}
              </p>
            </Link>
            <span className="home-row__when">{formatPrice(amountDue(enquiry))}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
