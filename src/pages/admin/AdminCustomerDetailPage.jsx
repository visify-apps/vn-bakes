import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSmartBack } from '../../hooks/useSmartBack'
import { MessageCircle, Phone } from 'lucide-react'
import {
  getCustomer,
  enquiryMatchesCustomer,
  updateCustomer,
} from '../../services/firestore/customers'
import { listEnquiries } from '../../services/firestore/adminEnquiries'
import { generateWhatsAppLink } from '../../services/whatsapp'
import { formatPhone, telHref } from '../../utils/phone'
import { formatPrice } from '../../utils/pricing'
import { amountDue } from '../../utils/moneyLists'
import { dueLabel, sortByDeliveryDate } from '../../utils/jobDate'

export function AdminCustomerDetailPage() {
  const { customerId } = useParams()
  const goBack = useSmartBack('/admin/customers')
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getCustomer(customerId), listEnquiries()])
      .then(([person, enquiries]) => {
        if (cancelled) return
        if (!person) {
          setMissing(true)
          return
        }
        setCustomer(person)
        setNotes(person.notes || '')
        setJobs(sortByDeliveryDate(enquiries.filter((e) => enquiryMatchesCustomer(e, person))))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const last = useMemo(() => {
    return [...jobs].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0]
  }, [jobs])
  const lastLine = useMemo(() => {
    if (!last) return ''
    return [last.productName || last.requestType, last.flavour, last.cakeSize].filter(Boolean).join(' · ')
  }, [last])

  async function saveNotes() {
    if (!customer) return
    setSaving(true)
    try {
      const next = await updateCustomer(customer.id, { notes })
      setCustomer(next)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="page admin-page">
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (missing || !customer) {
    return (
      <section className="page admin-page">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
        <p className="muted">Not found.</p>
      </section>
    )
  }

  const callHref = telHref(customer.phone)
  const wa = generateWhatsAppLink(customer.phone, `Hi ${customer.name?.split(' ')[0] || ''}…`)
  const waHref = wa && wa !== '#' ? wa : null

  return (
    <section className="page admin-page customer-detail">
      <div className="job-detail-bar">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
      </div>

      <header className="customer-hero">
        <h1>{customer.name}</h1>
        <p>{formatPhone(customer.phone) || customer.phone}</p>
        {lastLine ? <p className="customer-hero__last">{lastLine}</p> : null}
        <p className="customer-hero__meta">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          {customer.totalSpend ? ` · ${formatPrice(customer.totalSpend)}` : ''}
        </p>
      </header>

      <section className="admin-panel admin-panel--notes">
        <textarea
          rows={2}
          placeholder="Note"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          style={{ marginTop: '0.75rem' }}
          disabled={saving}
          onClick={saveNotes}
        >
          Save note
        </button>
      </section>

      {jobs.length ? (
        <section className="home-block">
          <div className="home-block__head">
            <h2>Jobs</h2>
          </div>
          <div className="home-stack">
            {jobs.map((enquiry) => {
              const due = amountDue(enquiry)
              return (
                <article key={enquiry.id} className={`home-row${due ? ' home-row--soon' : ''}`}>
                  <Link
                    to={`/admin/enquiries/${enquiry.id}`}
                    state={{ from: `/admin/customers/${customer.id}` }}
                    className="home-row__main"
                  >
                    <strong>{enquiry.productName || enquiry.requestType || 'Cake'}</strong>
                    <p>{due ? 'Collect' : dueLabel(enquiry)}</p>
                  </Link>
                  <span className="home-row__when">
                    {formatPrice(due || enquiry.quotedPrice) || '—'}
                  </span>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <p className="muted">No jobs yet.</p>
      )}

      <div className={`admin-sticky-actions${callHref ? ' has-call' : ''}`}>
        {callHref ? (
          <a className="btn btn-call" href={callHref} aria-label="Call">
            <Phone size={18} strokeWidth={2} aria-hidden="true" />
          </a>
        ) : null}
        {waHref ? (
          <a className="btn btn-whatsapp" href={waHref} target="_blank" rel="noreferrer">
            <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
            WhatsApp
          </a>
        ) : (
          <span />
        )}
      </div>
    </section>
  )
}
