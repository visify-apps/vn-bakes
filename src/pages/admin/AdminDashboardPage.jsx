import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { listEnquiries } from '../../services/firestore/adminEnquiries'
import { generateWhatsAppLink } from '../../services/whatsapp'
import { useAccess } from '../../context/AccessContext'
import { ownerPlanMessage } from '../../utils/subscription'
import { buildHomeLists } from '../../utils/homeLists'
import { dueLabel, homeDateParts, localDateKey } from '../../utils/jobDate'

function waLink(enquiry) {
  const phone = enquiry.customerSnapshot?.phone
  if (!phone) return null
  const link = generateWhatsAppLink(
    phone,
    `Hi ${enquiry.customerSnapshot?.name?.split(' ')[0] || ''}, regarding ${enquiry.enquiryNumber}…`,
  )
  return link && link !== '#' ? link : null
}

function HomeRow({ enquiry }) {
  const wa = waLink(enquiry)
  const when = dueLabel(enquiry)

  return (
    <article className={`home-row${when === 'Today' || when.endsWith('late') ? ' home-row--soon' : ''}`}>
      <Link
        to={`/admin/enquiries/${enquiry.id}`}
        state={{ from: '/admin' }}
        className="home-row__main"
      >
        <strong>{enquiry.productName || enquiry.requestType || 'Cake'}</strong>
        <p>
          {enquiry.customerSnapshot?.name || 'Customer'}
          {enquiry.cakeSize ? ` · ${enquiry.cakeSize}` : ''}
        </p>
      </Link>
      <span className="home-row__when">{when}</span>
      {wa ? (
        <a className="home-row__wa" href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp">
          <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
        </a>
      ) : null}
    </article>
  )
}

function HomeBlock({ title, to, items }) {
  if (!items.length) return null
  return (
    <section className="home-block">
      <div className="home-block__head">
        <h2>
          {title}
          <em>{items.length}</em>
        </h2>
        {to ? <Link to={to}>All</Link> : null}
      </div>
      <div className="home-stack">
        {items.map((enquiry) => (
          <HomeRow key={enquiry.id} enquiry={enquiry} />
        ))}
      </div>
    </section>
  )
}

function SummaryTile({ to, value, label, warn }) {
  const className = `home-stat${warn ? ' home-stat--warn' : ''}${value ? '' : ' is-zero'}`
  const inner = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  )
  if (!to) return <div className={className}>{inner}</div>
  return (
    <Link to={to} className={className}>
      {inner}
    </Link>
  )
}

export function AdminDashboardPage() {
  const { access } = useAccess()
  const planNote = ownerPlanMessage(access)
  const [lists, setLists] = useState(null)
  const [loading, setLoading] = useState(true)
  const date = useMemo(() => homeDateParts(localDateKey()), [])

  useEffect(() => {
    let cancelled = false
    listEnquiries()
      .then((items) => {
        if (!cancelled) setLists(buildHomeLists(items))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = lists?.counts
  const quiet =
    !loading && lists && !lists.newJobs.length && !lists.noAdvance.length && !lists.baking.length

  return (
    <section className="page admin-home">
      <header className="home-hero">
        <h1>{date.weekday}</h1>
        <p>{date.rest}</p>
      </header>

      {planNote && access.open ? <p className="plan-banner">{planNote}</p> : null}

      {loading ? <p className="muted">Loading…</p> : null}

      {counts ? (
        <div className="home-stats">
          <SummaryTile to="/admin/enquiries?status=NEW" value={counts.new} label="New" />
          <SummaryTile
            to="/admin/enquiries?status=QUOTED"
            value={counts.noAdvance}
            label="No advance"
            warn={counts.noAdvance > 0}
          />
          <SummaryTile value={counts.today} label="Today" warn={counts.today > 0} />
          <SummaryTile
            to="/admin/enquiries?status=IN_PROGRESS"
            value={counts.baking}
            label="Bake"
          />
        </div>
      ) : null}

      {counts?.late ? (
        <p className="home-late">{counts.late} past the date</p>
      ) : null}

      {quiet ? <p className="muted">Nothing waiting.</p> : null}

      {lists ? (
        <>
          <HomeBlock title="New" to="/admin/enquiries?status=NEW" items={lists.newJobs} />
          <HomeBlock title="No advance" to="/admin/enquiries?status=QUOTED" items={lists.noAdvance} />
          <HomeBlock title="Bake" to="/admin/enquiries?status=IN_PROGRESS" items={lists.baking} />
        </>
      ) : null}
    </section>
  )
}
