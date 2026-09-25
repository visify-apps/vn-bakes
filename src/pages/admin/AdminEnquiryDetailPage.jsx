import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Egg,
  Hash,
  IceCreamCone,
  MapPin,
  Package,
  Palette,
  PartyPopper,
  Phone,
  Scaling,
  Shapes,
  Sparkles,
  StickyNote,
  Truck,
  Type,
} from 'lucide-react'
import { StatusBadge } from '../../components/admin/StatusBadge'
import {
  computeBalance,
  getEnquiry,
  updateEnquiry,
} from '../../services/firestore/adminEnquiries'
import { upsertCustomerFromEnquiry } from '../../services/firestore/customers'
import { createOrderFromEnquiry, updateOrder } from '../../services/firestore/orders'
import { getProduct } from '../../services/firestore/catalogue'
import {
  buildQuotationMessage,
  generateWhatsAppLink,
} from '../../services/whatsapp'
import { formatPrice } from '../../utils/pricing'
import { canAutoPrice } from '../../utils/autoPrice'
import { deliveryParts, dueLabel } from '../../utils/jobDate'
import { telHref } from '../../utils/phone'
import {
  previousSimpleStatus,
  revertConfirmMessage,
  simpleStatusMeta,
  statusTone,
  storeStatusFromSimple,
  toSimpleStatus,
} from '../../utils/simpleStatus'
import { useSmartBack } from '../../hooks/useSmartBack'

function pretty(value) {
  if (value == null || value === '') return ''
  const text = String(value).trim()
  if (!text || text === '-') return ''
  if (text === 'eggless') return 'Eggless'
  if (text === 'egg') return 'Egg'
  if (text === 'delivery') return 'Delivery'
  if (text === 'pickup') return 'Pickup'
  return text
}

function qtyLabel(value) {
  const text = pretty(value)
  if (!text) return ''
  if (/pcs|piece|kg|g\b|seat/i.test(text)) return text
  return `${text} pcs`
}

function isGiftEnquiry(enquiry) {
  if (!enquiry) return false
  const type = String(enquiry.requestType || '')
  const name = String(enquiry.productName || '')
  return /bouquet|chocolate/i.test(type) || /bouquet|chocolate/i.test(name)
}

function Fact({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="job-fact">
      <Icon className="job-fact__icon" size={16} strokeWidth={2} aria-hidden="true" />
      <span className="job-fact__text">
        <em>{label}</em>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

export function AdminEnquiryDetailPage() {
  const { id } = useParams()
  const goBack = useSmartBack('/admin')
  const [enquiry, setEnquiry] = useState(null)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [quotedPrice, setQuotedPrice] = useState('')
  const [advanceRequired, setAdvanceRequired] = useState('')
  const [quoteShared, setQuoteShared] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setQuoteShared(false)
    getEnquiry(id)
      .then(async (data) => {
        if (cancelled) return
        setEnquiry(data)
        if (data) {
          setNote(data.internalNotes || '')
          setQuotedPrice(data.quotedPrice != null ? String(data.quotedPrice) : '')
          setAdvanceRequired(data.advanceRequired != null ? String(data.advanceRequired) : '')
          if (data.productId) {
            const p = await getProduct(data.productId)
            if (!cancelled) setProduct(p)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const balance = useMemo(
    () => computeBalance(quotedPrice, advanceRequired),
    [quotedPrice, advanceRequired],
  )

  const autoPriced = Boolean(
    enquiry?.priceLocked ||
      (product && canAutoPrice(product) && enquiry?.quotedPrice != null) ||
      enquiry?.autoPriced,
  )

  const savedStatus = toSimpleStatus(enquiry?.status)
  const showQuoteForm = savedStatus === 'NEW'
  const alreadyPriced = Boolean(enquiry?.quotedPrice != null && savedStatus !== 'NEW')
  const balanceDue = Number(enquiry?.balanceAmount ?? balance) || 0
  const fullyPaid = enquiry?.paymentStatus === 'PAID' || (alreadyPriced && balanceDue <= 0)

  const customerPhone = enquiry?.customerSnapshot?.phone
  const customerFirstName = enquiry?.customerSnapshot?.name?.split(' ')[0] || 'there'
  const date = enquiry ? deliveryParts(enquiry) : null
  const countdown = enquiry ? dueLabel(enquiry) : ''

  function quotePayload() {
    const quote = Number(quotedPrice)
    const advance = Number(advanceRequired) || 0
    if (!Number.isFinite(quote) || quote <= 0) {
      return { error: 'Enter a quote amount first.' }
    }
    if (advance < 0 || advance > quote) {
      return { error: 'Advance must be between ₹0 and the total.' }
    }
    return { quotedPrice: quote, advanceRequired: advance, balanceAmount: computeBalance(quote, advance) }
  }

  async function savePatch(patch) {
    setSaving(true)
    setError('')
    try {
      const updated = await updateEnquiry(enquiry.id, patch)
      setEnquiry(updated)
      if (patch.quotedPrice != null) setQuotedPrice(String(patch.quotedPrice))
      if (patch.advanceRequired != null) setAdvanceRequired(String(patch.advanceRequired))
      return updated
    } catch (err) {
      setError(err?.message || 'Could not save.')
      return null
    } finally {
      setSaving(false)
    }
  }

  function handleSendQuoteClick(event) {
    const parsed = quotePayload()
    if (parsed.error) {
      event.preventDefault()
      setError(parsed.error)
      return
    }
    setError('')
    setQuoteShared(true)
  }

  async function markQuoteSent() {
    const parsed = quotePayload()
    if (parsed.error) {
      setError(parsed.error)
      return
    }
    if (customerPhone && !quoteShared) {
      setError('Send the quote on WhatsApp first, then tap Quote sent.')
      return
    }
    const updated = await savePatch({
      ...parsed,
      status: 'QUOTE_SENT',
      quoteSentAt: new Date().toISOString(),
    })
    if (updated) setQuoteShared(false)
  }

  async function markAdvanceReceived() {
    setSaving(true)
    setError('')
    try {
      const advance = Number(enquiry.advanceRequired) || Number(advanceRequired) || 0
      const updated = await updateEnquiry(enquiry.id, {
        status: 'IN_PREPARATION',
        paymentStatus: advance > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        advanceReceivedAt: new Date().toISOString(),
      })
      setEnquiry(updated)
      if (!updated.orderId) {
        await upsertCustomerFromEnquiry(updated)
        await createOrderFromEnquiry({
          ...updated,
          status: 'IN_PREPARATION',
          quotedPrice: Number(updated.quotedPrice) || 0,
          advanceRequired: Number(updated.advanceRequired) || 0,
          balanceAmount: updated.balanceAmount,
        })
        const refreshed = await getEnquiry(enquiry.id)
        setEnquiry(refreshed)
      }
    } catch (err) {
      setError(err?.message || 'Could not update this job.')
    } finally {
      setSaving(false)
    }
  }

  async function markHandedOver() {
    await savePatch({
      status: 'COMPLETED',
      handedOverAt: new Date().toISOString(),
    })
  }

  async function collectBalance() {
    setSaving(true)
    setError('')
    try {
      const updated = await updateEnquiry(enquiry.id, {
        paymentStatus: 'PAID',
        balanceAmount: 0,
        paidAt: new Date().toISOString(),
      })
      setEnquiry(updated)
      if (updated.orderId) {
        await updateOrder(updated.orderId, { paymentStatus: 'PAID', balanceAmount: 0 })
      }
    } catch (err) {
      setError(err?.message || 'Could not record payment.')
    } finally {
      setSaving(false)
    }
  }

  async function cancelJob() {
    if (!window.confirm('Cancel this job?')) return
    await savePatch({
      status: 'CANCELLED',
      statusBeforeCancel: enquiry.status,
    })
  }

  async function revertStep() {
    const previous = previousSimpleStatus(savedStatus, enquiry.statusBeforeCancel)
    if (!previous) return
    if (!window.confirm(revertConfirmMessage(savedStatus))) return

    const patch = { status: storeStatusFromSimple(previous) }
    if (savedStatus === 'QUOTED') {
      patch.quoteSentAt = null
      setQuoteShared(false)
    }
    if (savedStatus === 'IN_PROGRESS') {
      patch.advanceReceivedAt = null
      patch.paymentStatus = 'UNPAID'
    }
    if (savedStatus === 'HANDED_OVER') {
      patch.handedOverAt = null
    }
    if (savedStatus === 'CANCELLED') {
      patch.statusBeforeCancel = null
    }
    await savePatch(patch)
  }

  if (loading) {
    return (
      <section className="page admin-page">
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (!enquiry) {
    return (
      <section className="page admin-page">
        <h1>Not found</h1>
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          Back
        </button>
      </section>
    )
  }

  const quoteMessage = buildQuotationMessage(
    {
      enquiryNumber: enquiry.enquiryNumber,
      productName: enquiry.productName,
      requestType: enquiry.requestType,
      quotedPrice: quotedPrice || enquiry.quotedPrice || 0,
      advanceRequired: advanceRequired || enquiry.advanceRequired || 0,
      balanceAmount: balance,
    },
    { customerFirstName },
  )
  const quoteWa = customerPhone ? generateWhatsAppLink(customerPhone, quoteMessage) : null
  const openWa = customerPhone
    ? generateWhatsAppLink(customerPhone, `${enquiry.enquiryNumber} — following up.`)
    : null
  const isGift = isGiftEnquiry(enquiry)
  const priceValue = Number(quotedPrice) || Number(enquiry.quotedPrice)
  const address = enquiry.deliveryAddress
  const canCancel = savedStatus !== 'HANDED_OVER' && savedStatus !== 'CANCELLED'
  const previous = previousSimpleStatus(savedStatus, enquiry.statusBeforeCancel)
  const previousLabel = previous ? simpleStatusMeta(previous).label : null
  const showPrice = alreadyPriced || (autoPriced && priceValue)
  const advanceIn = savedStatus === 'IN_PROGRESS' || savedStatus === 'HANDED_OVER'
  const advanceAmount = Number(advanceRequired) || Number(enquiry.advanceRequired) || 0
  const collectAdvance = !advanceIn && !fullyPaid && advanceAmount > 0

  let primary = null
  if (savedStatus === 'NEW') {
    primary = {
      label: 'Quote sent',
      onClick: markQuoteSent,
      disabled: Boolean(customerPhone && !quoteShared),
    }
  } else if (savedStatus === 'QUOTED') {
    primary = { label: 'Advance received', onClick: markAdvanceReceived }
  } else if (savedStatus === 'IN_PROGRESS') {
    primary = { label: 'Handed over', onClick: markHandedOver }
  } else if (savedStatus === 'HANDED_OVER' && !fullyPaid && balanceDue > 0) {
    primary = { label: 'Collect balance', onClick: collectBalance }
  }

  const waHref = savedStatus === 'NEW' ? quoteWa : openWa
  const waLabel = savedStatus === 'NEW' ? 'Send quote on WhatsApp' : 'WhatsApp'

  const callHref = customerPhone ? telHref(customerPhone) : null

  return (
    <section className="page admin-page admin-enquiry-detail">
      <div className="job-detail-bar">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
        <StatusBadge status={enquiry.status} />
      </div>

      <article className={`job-hero job-card--${statusTone(savedStatus)}`}>
        <div className="job-hero__head">
          <div className="job-hero__copy">
            <h1>{enquiry.productName || enquiry.requestType}</h1>
            <p className="job-hero__who">{enquiry.customerSnapshot?.name || 'Customer'}</p>
          </div>
          <div className="job-hero__when">
            <strong>{countdown}</strong>
            {date ? (
              <span>
                {date.day} {date.month}
                {date.weekday ? ` · ${date.weekday}` : ''}
              </span>
            ) : null}
          </div>
        </div>

        {isGift ? (
          <>
            <div className="job-block">
              <Fact
                icon={Hash}
                label="Brief"
                value={
                  enquiry.servings
                    ? `${enquiry.servings} seat${Number(enquiry.servings) === 1 ? '' : 's'}`
                    : ''
                }
              />
              <Fact icon={Package} label="When" value={pretty(enquiry.preferredTime)} />
            </div>
            {pretty(enquiry.otherRequirements) || pretty(enquiry.referenceNotes) ? (
              <div className="job-block">
                <Fact
                  icon={StickyNote}
                  label="Details"
                  value={[pretty(enquiry.otherRequirements), pretty(enquiry.referenceNotes)]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            {pretty(enquiry.cakeSize) || qtyLabel(enquiry.servings) ? (
              <div className="job-block">
                <Fact icon={Scaling} label="Size" value={pretty(enquiry.cakeSize)} />
                <Fact icon={Hash} label="Qty" value={qtyLabel(enquiry.servings)} />
              </div>
            ) : null}

            {pretty(enquiry.flavour) ||
            pretty(enquiry.colourPreference) ||
            pretty(enquiry.eggPreference) ||
            pretty(enquiry.messageOnCake) ? (
              <div className="job-block">
                <Fact icon={IceCreamCone} label="Flavour" value={pretty(enquiry.flavour)} />
                <Fact icon={Palette} label="Colour" value={pretty(enquiry.colourPreference)} />
                <Fact icon={Egg} label="Egg" value={pretty(enquiry.eggPreference)} />
                <Fact icon={Type} label="On cake" value={pretty(enquiry.messageOnCake)} />
              </div>
            ) : null}

            {pretty(enquiry.shape) ||
            pretty(enquiry.occasion || enquiry.occasionOther) ||
            pretty(enquiry.theme) ? (
              <div className="job-block">
                <Fact icon={Shapes} label="Shape" value={pretty(enquiry.shape)} />
                <Fact
                  icon={PartyPopper}
                  label="Occasion"
                  value={pretty(enquiry.occasion || enquiry.occasionOther)}
                />
                <Fact icon={Sparkles} label="Theme" value={pretty(enquiry.theme)} />
              </div>
            ) : null}

            <div className="job-block">
              <Fact
                icon={pretty(enquiry.fulfillmentType) === 'Delivery' ? Truck : Package}
                label="Hand over"
                value={pretty(enquiry.fulfillmentType) || 'Pickup'}
              />
              {pretty(enquiry.fulfillmentType) === 'Delivery' &&
              (address?.address || address?.area) ? (
                <Fact
                  icon={MapPin}
                  label="Address"
                  value={`${[address.address, address.area, address.pincode]
                    .filter(Boolean)
                    .join(', ')}${address.notes ? ` · ${address.notes}` : ''}`}
                />
              ) : null}
            </div>

            {pretty(enquiry.otherRequirements) || pretty(enquiry.referenceNotes) ? (
              <div className="job-block">
                <Fact
                  icon={StickyNote}
                  label="Note"
                  value={[pretty(enquiry.otherRequirements), pretty(enquiry.referenceNotes)]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </div>
            ) : null}

            {enquiry.referenceImageUrl ? (
              <a
                className="job-hero__ref-link"
                href={enquiry.referenceImageUrl}
                target="_blank"
                rel="noreferrer"
              >
                <img className="job-hero__ref" src={enquiry.referenceImageUrl} alt="Reference" />
              </a>
            ) : null}
          </>
        )}

        {showPrice && priceValue && !showQuoteForm ? (
          <div className="job-block job-block--money">
            <div className="price-split">
              <div>
                <span>{autoPriced ? 'Menu total' : 'Quoted'}</span>
                <strong>{formatPrice(priceValue)}</strong>
              </div>
              <div className={collectAdvance ? 'is-due' : ''}>
                <span>{collectAdvance ? 'Collect advance' : 'Advance'}</span>
                <strong>{formatPrice(advanceAmount)}</strong>
              </div>
              <div className={advanceIn && !fullyPaid && (balanceDue || balance) > 0 ? 'is-due' : ''}>
                <span>{fullyPaid ? 'Paid' : 'Balance due'}</span>
                <strong>{formatPrice(fullyPaid ? 0 : balanceDue || balance) || '₹0'}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      {error ? <p className="form-error">{error}</p> : null}

      {showQuoteForm ? (
        <section className="admin-panel job-quote">
          <h2>Quote</h2>
          <div className="enquiry-fields">
            <label className="enquiry-field">
              <span>Total (₹)</span>
              <input
                inputMode="decimal"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
              />
            </label>
            <label className="enquiry-field">
              <span>Advance (₹)</span>
              <input
                inputMode="decimal"
                value={advanceRequired}
                onChange={(e) => setAdvanceRequired(e.target.value)}
              />
            </label>
          </div>
          <p className="quote-balance">
            <span>Collect advance</span>
            <strong>{formatPrice(Number(advanceRequired) || 0) || '₹0'}</strong>
          </p>
        </section>
      ) : null}

      <section className="admin-panel admin-panel--notes">
        <textarea rows={2} placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          style={{ marginTop: '0.75rem' }}
          disabled={saving}
          onClick={() => savePatch({ internalNotes: note })}
        >
          Save notes
        </button>
      </section>

      {previous || canCancel ? (
        <div className="job-meta-actions">
          {previous ? (
            <button type="button" className="job-revert" disabled={saving} onClick={revertStep}>
              Back to {previousLabel}
            </button>
          ) : null}
          {canCancel ? (
            <button type="button" className="job-cancel" disabled={saving} onClick={cancelJob}>
              Cancel job
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={`admin-sticky-actions${callHref ? ' has-call' : ''}`}>
        {callHref ? (
          <a className="btn btn-call" href={callHref} aria-label="Call">
            <Phone size={18} strokeWidth={2} aria-hidden="true" />
          </a>
        ) : null}
        {waHref && waHref !== '#' ? (
          <a
            className="btn btn-whatsapp"
            href={waHref}
            target="_blank"
            rel="noreferrer"
            onClick={savedStatus === 'NEW' ? handleSendQuoteClick : undefined}
          >
            {waLabel}
          </a>
        ) : (
          <span />
        )}
        {primary ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || primary.disabled}
            onClick={primary.onClick}
          >
            {primary.label}
          </button>
        ) : (
          <span />
        )}
      </div>
    </section>
  )
}
