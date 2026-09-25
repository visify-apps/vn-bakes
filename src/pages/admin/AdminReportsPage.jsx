import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../context/AccessContext'
import { useAuth } from '../../context/AuthContext'
import { useBusiness } from '../../context/BusinessContext'
import { listEnquiries } from '../../services/firestore/adminEnquiries'
import { listAdminProducts } from '../../services/firestore/adminProducts'
import { listCategories } from '../../services/firestore/catalogue'
import { listCustomers } from '../../services/firestore/customers'
import { formatPrice } from '../../utils/pricing'
import { buildReports } from '../../utils/reportLists'
import { reportsEnableMailto, VISIFY_MAIL } from '../../utils/visifyMail'

const SECTIONS = {
  ordered: {
    title: 'What they ordered',
    groups: [
      { key: 'requestTypes', title: 'Request type' },
      { key: 'products', title: 'Menu item' },
      { key: 'occasions', title: 'Occasion' },
      { key: 'sizes', title: 'Size' },
      { key: 'flavours', title: 'Flavour' },
      { key: 'eggs', title: 'Egg' },
      { key: 'shapes', title: 'Shape' },
      { key: 'themes', title: 'Theme' },
      { key: 'pricing', title: 'Pricing' },
    ],
  },
  handover: {
    title: 'Areas & busy days',
    groups: [
      { key: 'areas', title: 'Delivery area' },
      { key: 'pincodes', title: 'Pincode' },
      { key: 'busyDays', title: 'Busy days' },
    ],
  },
  spend: {
    title: 'Top spend',
    groups: [{ key: 'topSpend', title: 'Customers', money: true }],
  },
  menu: {
    title: 'Menu lists',
    groups: [
      { key: 'products', title: 'Enquiries per product' },
      { key: 'categories', title: 'Category' },
    ],
  },
}

function money(value) {
  return formatPrice(value) || '₹0'
}

function Tile({ value, label, warn, to }) {
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

function Dashboard({ stats }) {
  const moneyStats = stats.money
  const pipe = stats.pipeline
  const people = stats.people
  const handover = stats.handover
  const menu = stats.menu

  return (
    <>
      <section className="report-block">
        <div className="home-block__head">
          <h2>Money</h2>
          <Link to="/admin/money">Due</Link>
        </div>
        <div className="home-stats">
          <Tile value={money(moneyStats.quoted)} label="Quoted" />
          <Tile value={money(moneyStats.advanceIn)} label="Advance in" />
          <Tile value={money(moneyStats.due)} label="Balance due" warn={moneyStats.due > 0} to="/admin/money" />
          <Tile value={money(moneyStats.fullyPaid)} label="Fully paid" />
          <Tile value={money(moneyStats.sales)} label="Handed over" />
          <Tile value={money(moneyStats.averageTicket)} label="Average ticket" />
          <Tile value={moneyStats.owingCount} label="Owing" warn={moneyStats.owingCount > 0} to="/admin/money" />
          <Tile value={money(pipe.salesThisMonth)} label="This month" />
        </div>
      </section>

      <section className="report-block">
        <div className="home-block__head">
          <h2>Jobs</h2>
          <Link to="/admin/enquiries">All</Link>
        </div>
        <div className="home-stats">
          <Tile value={pipe.new} label="New" to="/admin/enquiries?status=NEW" />
          <Tile value={pipe.quoted} label="Quote sent" to="/admin/enquiries?status=QUOTED" warn={pipe.quoted > 0} />
          <Tile value={pipe.baking} label="Baking" to="/admin/enquiries?status=IN_PROGRESS" />
          <Tile value={pipe.done} label="Done" />
          <Tile value={pipe.taken} label="Taken" />
          <Tile value={pipe.conversion} label="Conversion" />
          <Tile value={pipe.cancelled} label="Cancelled" />
          <Tile value={pipe.weekJobs} label="Need-by week" />
          <Tile value={pipe.monthJobs} label="This month" />
          <Tile value={pipe.lastMonthJobs} label="Last month" />
          <Tile value={pipe.cancelRate} label="Cancel rate" />
          <Tile value={money(pipe.salesLastMonth)} label="Last month ₹" />
        </div>
      </section>

      <section className="report-block">
        <div className="home-block__head">
          <h2>Pickup vs delivery</h2>
        </div>
        <div className="home-stats">
          <Tile value={handover.pickup} label="Pickup" />
          <Tile value={handover.delivery} label="Delivery" />
          <Tile value={handover.avgLeadDays != null ? `${handover.avgLeadDays}d` : '—'} label="Avg lead" />
          <Tile value={pipe.needByThisMonth} label="Need-by month" />
        </div>
      </section>

      <section className="report-block">
        <div className="home-block__head">
          <h2>Customers</h2>
          <Link to="/admin/customers">All</Link>
        </div>
        <div className="home-stats">
          <Tile value={people.unique} label="People" to="/admin/customers" />
          <Tile value={people.newCount} label="New" />
          <Tile value={people.repeatCount} label="Repeat" />
          <Tile value={people.recency.week} label="Active week" />
        </div>
      </section>

      <section className="report-block">
        <div className="home-block__head">
          <h2>Menu</h2>
          <Link to="/admin/products">Edit</Link>
        </div>
        <div className="home-stats">
          <Tile value={menu.available} label="On menu" to="/admin/products" />
          <Tile value={menu.hidden} label="Hidden" />
        </div>
      </section>
    </>
  )
}

function SampleTile({ label }) {
  return (
    <i>
      ···
      <b>{label}</b>
    </i>
  )
}

function SamplePreview() {
  return (
    <div className="report-sample" aria-hidden="true">
      <span className="report-sample__stamp">Sample</span>

      <p>Money</p>
      <div className="report-sample__tiles">
        <SampleTile label="Quoted" />
        <SampleTile label="Advance in" />
        <SampleTile label="Balance due" />
        <SampleTile label="Fully paid" />
        <SampleTile label="Handed over" />
        <SampleTile label="Average ticket" />
        <SampleTile label="Owing" />
        <SampleTile label="This month" />
      </div>

      <p>Jobs</p>
      <div className="report-sample__tiles">
        <SampleTile label="New" />
        <SampleTile label="Quote sent" />
        <SampleTile label="Baking" />
        <SampleTile label="Done" />
        <SampleTile label="Taken" />
        <SampleTile label="Conversion" />
        <SampleTile label="Cancelled" />
        <SampleTile label="Need-by week" />
      </div>

      <p>Pickup vs delivery</p>
      <div className="report-sample__tiles">
        <SampleTile label="Pickup" />
        <SampleTile label="Delivery" />
        <SampleTile label="Avg lead" />
        <SampleTile label="Need-by month" />
      </div>

      <p>Customers</p>
      <div className="report-sample__tiles">
        <SampleTile label="People" />
        <SampleTile label="New" />
        <SampleTile label="Repeat" />
        <SampleTile label="Active week" />
      </div>

      <p>Menu</p>
      <div className="report-sample__tiles">
        <SampleTile label="On menu" />
        <SampleTile label="Hidden" />
      </div>

      <p>Lists you tap to open</p>
      <div className="report-sample__rows">
        <i>What they ordered · type, size, flavour, occasion</i>
        <i>Areas & busy days · pincode, need-by dates</i>
        <i>Top spend · who comes back</i>
        <i>Menu lists · which cakes get enquiries</i>
      </div>
    </div>
  )
}

function BreakdownLinks() {
  return (
    <div className="report-links">
      <Link to="/admin/reports/ordered">What they ordered</Link>
      <Link to="/admin/reports/handover">Areas & busy days</Link>
      <Link to="/admin/reports/spend">Top spend</Link>
      <Link to="/admin/reports/menu">Menu lists</Link>
    </div>
  )
}

function groupItems(stats, section, key) {
  if (section === 'ordered') return stats.ordered[key] || []
  if (section === 'handover') return stats.handover[key] || []
  if (section === 'spend') return stats.people[key] || []
  if (section === 'menu') return stats.menu[key] || []
  return []
}

function ReportsDetail({ stats, section }) {
  const meta = SECTIONS[section]
  const [open, setOpen] = useState(meta.groups[0]?.key || '')

  return (
    <div className="report-detail">
      {meta.groups.map((group) => {
        const items = groupItems(stats, section, group.key)
        const shown = open === group.key
        return (
          <section key={group.key} className="report-fold">
            <button type="button" className="report-fold__head" onClick={() => setOpen(shown ? '' : group.key)}>
              <span>
                {group.title}
                <em>{items.length}</em>
              </span>
              <span>{shown ? 'Hide' : 'Show'}</span>
            </button>
            {shown ? (
              items.length ? (
                <ul className="report-lines">
                  {items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{group.money || item.money ? money(item.count) : item.count}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nothing here yet.</p>
              )
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

export function AdminReportsPage() {
  const { access } = useAccess()
  const { user } = useAuth()
  const { business } = useBusiness()
  const { section } = useParams()
  const navigate = useNavigate()
  const requestMail = reportsEnableMailto({ business, user })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(Boolean(access.reports))
  const locked = !access.reports
  const view = SECTIONS[section] ? section : ''

  useEffect(() => {
    if (locked && section) {
      navigate('/admin/reports', { replace: true })
      return
    }
    if (section && !SECTIONS[section]) {
      navigate('/admin/reports', { replace: true })
    }
  }, [locked, section, navigate])

  useEffect(() => {
    if (!access.reports) {
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([listEnquiries(), listCustomers(), listAdminProducts(), listCategories()])
      .then(([enquiries, customers, products, categories]) => {
        if (!cancelled) setStats(buildReports({ enquiries, customers, products, categories }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [access.reports])

  const title = view ? SECTIONS[view].title : 'Reports'

  if (locked) {
    return (
      <section className="page admin-page admin-reports admin-reports--locked">
        <header className="menu-head">
          <div>
            <h1>Reports</h1>
            <p>Paid add-on · not on this plan</p>
          </div>
        </header>

        <div className="report-upsell">
          <p>
            See the week at a glance: money in, who still owes, what is baking, pickup vs delivery, and which cakes
            keep coming back — from your own jobs, not a spreadsheet.
          </p>
          <ul>
            <li>Quoted, advance, balance due, handed-over ₹</li>
            <li>New / quoted / baking / done, conversion, cancel rate</li>
            <li>Repeat customers and top spend</li>
            <li>Flavour, size, occasion, area — tap a list to open</li>
          </ul>
          <p>
            Switch it on for an extra amount. Write to <a href={requestMail}>{VISIFY_MAIL}</a> or the person who
            manages your plan.
          </p>
          <a className="btn btn-primary" href={requestMail}>
            Ask to enable Reports
          </a>
        </div>

        <p className="report-sample-label">Sample layout only. Dots are not your shop’s numbers.</p>
        <SamplePreview />
      </section>
    )
  }

  return (
    <section className="page admin-page admin-reports">
      <header className="menu-head">
        <div>
          {view ? (
            <button type="button" className="btn btn-ghost visify-back" onClick={() => navigate('/admin/reports')}>
              ← Reports
            </button>
          ) : null}
          <h1>{title}</h1>
          <p>
            {loading
              ? 'Loading…'
              : view
                ? 'Tap a row to open'
                : stats
                  ? `${stats.pipeline.taken} jobs · ${stats.pipeline.done} handed over`
                  : 'No jobs yet'}
          </p>
        </div>
      </header>

      {view && stats ? <ReportsDetail stats={stats} section={view} /> : null}

      {!view && stats ? (
        <>
          <Dashboard stats={stats} />
          <section className="report-block">
            <div className="home-block__head">
              <h2>Lists</h2>
            </div>
            <BreakdownLinks />
          </section>
        </>
      ) : null}
    </section>
  )
}
