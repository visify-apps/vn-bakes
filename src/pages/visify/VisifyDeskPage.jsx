import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appConfig } from '../../config/appConfig'
import { useAccess } from '../../context/AccessContext'
import { useAuth } from '../../context/AuthContext'
import {
  createShop,
  clearShopBilling,
  deletePayment,
  resetShopForGoLive,
  listPayments,
  listShops,
  pauseShop,
  recordPayment,
  resumeShop,
  shopIdFromName,
} from '../../services/firestore/subscription'
import {
  describeAccess,
  extendActiveUntil,
  planHighlight,
  planLabel,
} from '../../utils/subscription'

const PLAN_DAYS = [30, 90, 365]
const KINDS = [
  { id: 'bakery', label: 'Bakery' },
  { id: 'florist', label: 'Florist' },
  { id: 'other', label: 'Other' },
]

function kindLabel(kind) {
  return KINDS.find((item) => item.id === kind)?.label || 'Shop'
}

function ShopCard({ shop, saving, paymentCount, onOpen, onPause, onResume, onPay }) {
  const access = describeAccess(shop.subscription)
  const highlight = planHighlight(access)
  const tone = access.tone || 'idle'

  return (
    <article className={`visify-card visify-card--${tone}`}>
      <button type="button" className="visify-card__main" onClick={() => onOpen(shop.id)}>
        <span className={`visify-pill visify-pill--${tone}`}>{highlight.badge}</span>
        <strong>{shop.displayName}</strong>
        <p>
          {kindLabel(shop.kind)}
          {access.reports ? ' · Reports on' : ''}
        </p>
        <em className={`visify-card__value visify-card__value--${tone}`}>{highlight.value}</em>
        <span className="visify-card__detail">{highlight.detail}</span>
      </button>

      <div className="visify-card__actions">
        {access.open ? (
          <>
            <button type="button" className="btn visify-btn-pause" disabled={saving} onClick={() => onPause(shop)}>
              Pause
            </button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onPay(shop.id)}>
              Add days
            </button>
          </>
        ) : access.canResume ? (
          <>
            <button type="button" className="btn visify-btn-resume" disabled={saving} onClick={() => onResume(shop)}>
              Resume
            </button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onPay(shop.id)}>
              Add days
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onPay(shop.id)}>
            Record payment
          </button>
        )}
      </div>

      <button type="button" className="visify-card__link" onClick={() => onOpen(shop.id)}>
        {paymentCount == null ? 'Payments' : `${paymentCount} payment${paymentCount === 1 ? '' : 's'}`}
      </button>
    </article>
  )
}

export function VisifyDeskPage() {
  const { logout } = useAuth()
  const { reload } = useAccess()
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [counts, setCounts] = useState({})
  const [selectedId, setSelectedId] = useState('')
  const [screen, setScreen] = useState('list')
  const [payments, setPayments] = useState([])
  const [amount, setAmount] = useState('')
  const [dayPick, setDayPick] = useState(30)
  const [customDays, setCustomDays] = useState('')
  const [reports, setReports] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState('bakery')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const selected = shops.find((shop) => shop.id === selectedId) || null
  const access = describeAccess(selected?.subscription)
  const highlight = planHighlight(access)
  const daysToAdd = dayPick === 'custom' ? Number(customDays) : Number(dayPick)
  const nextUntil = useMemo(() => {
    if (!daysToAdd || daysToAdd < 1) return ''
    return extendActiveUntil(selected?.subscription?.activeUntil, daysToAdd)
  }, [daysToAdd, selected?.subscription?.activeUntil])

  async function refreshShops() {
    const items = await listShops()
    setShops(items)
    const nextCounts = {}
    await Promise.all(
      items.map(async (shop) => {
        nextCounts[shop.id] = (await listPayments(shop.id)).length
      }),
    )
    setCounts(nextCounts)
    return items
  }

  useEffect(() => {
    refreshShops()
      .catch(() => setError('Could not load shops.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId || (screen !== 'shop' && screen !== 'pay')) return
    const shop = shops.find((item) => item.id === selectedId)
    setReports(Boolean(shop?.subscription?.addons?.reports))
    listPayments(selectedId).then(setPayments)
  }, [selectedId, screen])

  async function afterChange(id, subscription) {
    setShops((current) =>
      current.map((shop) => (shop.id === id ? { ...shop, subscription } : shop)),
    )
    const rows = await listPayments(id)
    setPayments(rows)
    setCounts((current) => ({ ...current, [id]: rows.length }))
    if (id === appConfig.defaultBusinessId) await reload()
  }

  function openShop(id) {
    setSelectedId(id)
    setScreen('shop')
    setError('')
    setNote('')
  }

  function openPay(id) {
    setSelectedId(id)
    setScreen('pay')
    setAmount('')
    setDayPick(30)
    setCustomDays('')
    setError('')
    setNote('')
  }

  function backToList() {
    setScreen('list')
    setSelectedId('')
    setError('')
  }

  async function handleCreate(event) {
    event.preventDefault()
    const id = shopIdFromName(newName)
    if (!id) {
      setError('Enter the shop name.')
      return
    }
    if (shops.some((shop) => shop.id === id)) {
      setError('That shop is already on the list.')
      setNewName('')
      openShop(id)
      return
    }
    setSaving(true)
    setError('')
    try {
      const shop = await createShop({ businessId: id, displayName: newName.trim(), kind: newKind })
      setNewName('')
      await refreshShops()
      openPay(shop.id)
      setNote('Shop added. Record a payment to open enquiries.')
    } catch (err) {
      setError(err?.message || 'Could not create shop.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePay(event) {
    event.preventDefault()
    if (!selected) return
    if (!daysToAdd || daysToAdd < 1) {
      setError('Enter how many days to add.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await recordPayment({
        businessId: selected.id,
        amount,
        days: daysToAdd,
        reports,
        displayName: selected.displayName,
      })
      setAmount('')
      setCustomDays('')
      setDayPick(30)
      setNote(`Active until ${result.subscription.activeUntil}`)
      await afterChange(selected.id, result.subscription)
      setScreen('shop')
    } catch (err) {
      setError(err?.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePause(shop) {
    if (!window.confirm(`Pause new enquiries for ${shop.displayName}? Remaining plan days stay the same.`)) return
    setSaving(true)
    setError('')
    try {
      const subscription = await pauseShop(shop.id)
      setNote(`Paused · same plan until ${subscription.activeUntil || '—'}`)
      await afterChange(shop.id, subscription)
    } catch (err) {
      setError(err?.message || 'Could not pause.')
    } finally {
      setSaving(false)
    }
  }

  async function handleResume(shop) {
    setSaving(true)
    setError('')
    try {
      const subscription = await resumeShop(shop.id)
      setNote(`Resumed · until ${subscription.activeUntil}`)
      await afterChange(shop.id, subscription)
    } catch (err) {
      setError(err?.message || 'Could not resume.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePayment(payment) {
    if (!selected) return
    if (!window.confirm(`Remove this ₹${payment.amount} payment from the list? Plan dates stay.`)) return
    setSaving(true)
    setError('')
    try {
      const rows = await deletePayment(selected.id, payment.id)
      setPayments(rows)
      setCounts((current) => ({ ...current, [selected.id]: rows.length }))
      setNote('Payment removed from the list.')
    } catch (err) {
      setError(err?.message || 'Could not delete payment.')
    } finally {
      setSaving(false)
    }
  }

  async function handleGoLive() {
    if (!selected) return
    if (
      !window.confirm(
        `Prepare ${selected.displayName} for the client?\n\nDeletes: jobs, customers, orders, test payments, and the current plan.\nKeeps: menu, shop settings, baker login.\n\nThe shop stays closed until you record the real payment.`,
      )
    ) {
      return
    }
    const typed = window.prompt(`Type ${selected.id} to confirm the wipe.`)
    if (typed !== selected.id) {
      if (typed != null) setError('Wipe cancelled. Type the shop id exactly.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await resetShopForGoLive(selected.id)
      await afterChange(selected.id, result.subscription)
      setPayments(result.payments)
      setNote('Fresh shop. Record the real payment when the baker is ready.')
    } catch (err) {
      setError(err?.message || 'Could not reset the shop.')
    } finally {
      setSaving(false)
    }
  }

  async function handleClearBilling() {
    if (!selected) return
    if (
      !window.confirm(
        `Remove ALL test payments and the current plan for ${selected.displayName}?\n\nMenu, jobs, and customers stay.`,
      )
    ) {
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await clearShopBilling(selected.id)
      await afterChange(selected.id, result.subscription)
      setPayments(result.payments)
      setNote('Test billing cleared. Shop data is untouched.')
    } catch (err) {
      setError(err?.message || 'Could not clear billing.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <section className="page admin-page visify-desk">
      <header className="visify-top">
        {screen === 'list' ? (
          <div>
            <h1>Visify</h1>
            <p>{loading ? 'Loading…' : `${shops.length} shop${shops.length === 1 ? '' : 's'}`}</p>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost visify-back" onClick={backToList}>
            ← Shops
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {note ? <p className="visify-desk__note">{note}</p> : null}

      {screen === 'list' ? (
        <>
          <button
            type="button"
            className="btn btn-secondary visify-desk__new"
            onClick={() => {
              setScreen('new')
              setError('')
              setNote('')
            }}
          >
            New shop
          </button>

          {loading ? <p className="muted">Loading shops…</p> : null}

          <div className="visify-desk__list">
            {shops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                saving={saving}
                paymentCount={counts[shop.id]}
                onOpen={openShop}
                onPause={handlePause}
                onResume={handleResume}
                onPay={openPay}
              />
            ))}
          </div>
        </>
      ) : null}

      {screen === 'new' ? (
        <form className="visify-sheet" onSubmit={handleCreate}>
          <h2>New shop</h2>
          <label className="enquiry-field">
            <span>Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Bommi's Bakery"
              autoFocus
              required
            />
          </label>
          {newName.trim() ? <p className="muted visify-desk__id">id · {shopIdFromName(newName) || '—'}</p> : null}
          <div className="option-grid">
            {KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`option-chip${newKind === item.id ? ' is-selected' : ''}`}
                onClick={() => setNewKind(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="submit" className="btn btn-primary visify-sticky-save" disabled={saving}>
            {saving ? 'Saving…' : 'Add shop'}
          </button>
        </form>
      ) : null}

      {screen === 'shop' && selected ? (
        <div className="visify-sheet">
          <div className={`visify-status visify-status--${access.tone || 'idle'}`}>
            <span>{highlight.badge}</span>
            <strong>{selected.displayName}</strong>
            <p>
              {kindLabel(selected.kind)} · {planLabel(access)}
            </p>
            <em>{highlight.value}</em>
          </div>

          <div className="visify-card__actions">
            {access.open ? (
              <>
                <button type="button" className="btn visify-btn-pause" disabled={saving} onClick={() => handlePause(selected)}>
                  Pause
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => openPay(selected.id)}>
                  Add days
                </button>
              </>
            ) : access.canResume ? (
              <>
                <button type="button" className="btn visify-btn-resume" disabled={saving} onClick={() => handleResume(selected)}>
                  Resume
                </button>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => openPay(selected.id)}>
                  Add days
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => openPay(selected.id)}>
                Record payment
              </button>
            )}
          </div>

          <section className="visify-desk__ledger">
            <div className="visify-desk__ledger-head">
              <h2>Payments</h2>
            </div>
            {payments.length ? (
              <ul>
                {payments.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>₹{row.amount}</strong>
                      <span>
                        {row.days} days
                        {row.activeUntil ? ` · until ${row.activeUntil}` : ''}
                        {row.paidAt ? ` · ${String(row.paidAt).slice(0, 10)}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="visify-desk__delete"
                      disabled={saving}
                      onClick={() => handleDeletePayment(row)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No payments yet.</p>
            )}
            {payments.length || !selected.subscription?.missing ? (
              <button type="button" className="btn btn-ghost visify-clear" disabled={saving} onClick={handleClearBilling}>
                Remove test billing
              </button>
            ) : null}
          </section>

          <section className="visify-golive">
            <h2>Hand to client</h2>
            <p>
              Wipe jobs, customers, and test billing. Menu, WhatsApp, and baker login stay. Shop stays closed until you
              record the real payment.
            </p>
            <button type="button" className="btn visify-golive__btn" disabled={saving} onClick={handleGoLive}>
              {saving ? 'Clearing…' : 'Prepare for go-live'}
            </button>
          </section>
        </div>
      ) : null}

      {screen === 'pay' && selected ? (
        <form className="visify-sheet" onSubmit={handlePay}>
          <h2>{selected.displayName}</h2>
          <p className="muted visify-desk__id">
            {access.activeUntil ? `Current plan until ${access.activeUntil}` : 'No active plan'}
          </p>

          <label className="enquiry-field">
            <span>Amount received</span>
            <input
              className="visify-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="₹ 0"
              required
            />
          </label>

          <p className="visify-desk__label">Days to add</p>
          <div className="option-grid">
            {PLAN_DAYS.map((value) => (
              <button
                key={value}
                type="button"
                className={`option-chip${dayPick === value ? ' is-selected' : ''}`}
                onClick={() => setDayPick(value)}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              className={`option-chip${dayPick === 'custom' ? ' is-selected' : ''}`}
              onClick={() => setDayPick('custom')}
            >
              Custom
            </button>
          </div>
          {dayPick === 'custom' ? (
            <label className="enquiry-field">
              <span>Number of days</span>
              <input
                inputMode="numeric"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="e.g. 45"
                autoFocus
                required
              />
            </label>
          ) : null}

          {nextUntil ? (
            <p className="visify-desk__preview">
              Runs until <strong>{nextUntil}</strong>
            </p>
          ) : null}

          <label className={`visify-desk__toggle${reports ? ' is-on' : ''}`}>
            <input type="checkbox" checked={reports} onChange={(e) => setReports(e.target.checked)} />
            <span>Reports {reports ? 'on' : 'off'}</span>
          </label>

          <button type="submit" className="btn btn-primary visify-sticky-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save payment'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
