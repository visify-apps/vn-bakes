import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ListFilter } from 'lucide-react'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { listEnquiries } from '../../services/firestore/adminEnquiries'
import { generateWhatsAppLink } from '../../services/whatsapp'
import { SIMPLE_STATUSES, statusTone, toSimpleStatus } from '../../utils/simpleStatus'
import { deliveryParts, sortByDeliveryDate } from '../../utils/jobDate'

export function AdminEnquiriesPage() {
  const [params, setParams] = useSearchParams()
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const rawStatus = params.get('status') || ''
  const statusFilter =
    { CONFIRMED: 'IN_PROGRESS', DONE: 'HANDED_OVER' }[rawStatus] || rawStatus
  const activeFilterLabel = SIMPLE_STATUSES.find((s) => s.id === statusFilter)?.label

  useEffect(() => {
    let cancelled = false
    listEnquiries()
      .then((data) => {
        if (!cancelled) setEnquiries(data)
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
    const items = enquiries.filter((e) => {
      if (statusFilter && toSimpleStatus(e.status) !== statusFilter) return false
      if (!q) return true
      const hay = [
        e.enquiryNumber,
        e.customerSnapshot?.name,
        e.customerSnapshot?.phone,
        e.productName,
        e.requestType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    return sortByDeliveryDate(items)
  }, [enquiries, statusFilter, search])

  function setStatus(value) {
    const next = new URLSearchParams(params)
    if (value) next.set('status', value)
    else next.delete('status')
    setParams(next)
  }

  return (
    <section className="page admin-page">
      <header className="page-header">
        <h1>Jobs</h1>
        <p className="lede">New requests and orders in one list.</p>
      </header>

      <div className="jobs-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search name, phone, ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className={`btn btn-secondary jobs-filter-btn${statusFilter ? ' is-on' : ''}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <ListFilter size={18} strokeWidth={2} aria-hidden="true" />
          {activeFilterLabel || 'Filter'}
        </button>
      </div>

      {filtersOpen ? (
        <div className="quick-filters" role="tablist" aria-label="Status">
          <button
            type="button"
            className={`quick-filter${!statusFilter ? ' is-active' : ''}`}
            onClick={() => setStatus('')}
          >
            All
          </button>
          {SIMPLE_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`quick-filter${statusFilter === s.id ? ' is-active' : ''}`}
              onClick={() => setStatus(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && filtered.length === 0 ? <p className="muted">No jobs here.</p> : null}

      <div className="job-list">
        {filtered.map((enquiry) => {
          const phone = enquiry.customerSnapshot?.phone
          const wa = phone
            ? generateWhatsAppLink(
                phone,
                `Hi ${enquiry.customerSnapshot?.name || ''}, regarding ${enquiry.enquiryNumber}…`,
              )
            : null
          const simple = toSimpleStatus(enquiry.status)
          const date = deliveryParts(enquiry)
          return (
            <article key={enquiry.id} className={`job-card job-card--${statusTone(simple)}`}>
              <Link
                to={`/admin/enquiries/${enquiry.id}`}
                state={{ from: `/admin/enquiries${statusFilter ? `?status=${statusFilter}` : ''}` }}
                className="job-card__main"
              >
                <div className="job-card__copy">
                  <StatusBadge status={enquiry.status} />
                  <strong>{enquiry.customerSnapshot?.name || enquiry.enquiryNumber}</strong>
                  <p>{enquiry.productName || enquiry.requestType}</p>
                </div>
                <div className="job-card__date">
                  <span className="job-card__day">{date.day}</span>
                  <span className="job-card__month">{date.month}</span>
                  <span className="job-card__weekday">{date.weekday}</span>
                </div>
              </Link>
              <div className="job-card__actions">
                <Link
                  className="btn btn-secondary btn-small"
                  to={`/admin/enquiries/${enquiry.id}`}
                  state={{ from: `/admin/enquiries${statusFilter ? `?status=${statusFilter}` : ''}` }}
                >
                  Open
                </Link>
                {wa && wa !== '#' ? (
                  <a className="btn btn-primary btn-small" href={wa} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
