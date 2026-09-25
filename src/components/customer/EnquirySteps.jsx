import { Children } from 'react'
import {
  Egg,
  Hash,
  IceCreamCone,
  MapPin,
  Package,
  Palette,
  PartyPopper,
  Scaling,
  Shapes,
  Sparkles,
  StickyNote,
  Truck,
  Type,
} from 'lucide-react'
import { OptionGrid } from './OptionGrid'
import { FULFILLMENT_TYPES, OCCASIONS, REQUEST_TYPES, DELIVERY_TIME_SLOTS, SERVICE_AREAS, PICKUP_POINTS } from '../../data/enquiryOptions'
import { formatDisplayDate, getMinPreferredDateISO } from '../../utils/enquiry'
import { formatPrice } from '../../utils/pricing'
import { canAutoPrice, suggestedAdvance } from '../../utils/autoPrice'
import { CAKE_SIZES, customerPrice, estimateLine, parseQty } from '../../utils/enquiryRules'
import { VisifyNote } from '../VisifyNote'

const EGG_REQUIRED = [
  { value: 'eggless', label: 'Eggless' },
  { value: 'egg', label: 'With egg' },
]

function applyQty(product, draft, raw) {
  const next = { ...draft, servings: raw }
  const total = estimateLine(product, raw)
  if (total != null) {
    const adv = suggestedAdvance(total)
    next.quotedPrice = total
    next.advanceRequired = adv
    next.balanceAmount = total - adv
    next.autoPriced = true
    next.priceLocked = true
  } else {
    next.quotedPrice = null
    next.advanceRequired = null
    next.balanceAmount = null
    next.autoPriced = false
    next.priceLocked = false
  }
  return next
}

function Field({ label, required, children }) {
  return (
    <label className="enquiry-field">
      <span>
        {label}
        {required ? <i aria-hidden="true"> *</i> : null}
      </span>
      {children}
    </label>
  )
}

function Block({ children }) {
  const items = Children.toArray(children).filter(Boolean)
  if (!items.length) return null
  return <div className="job-block">{items}</div>
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

export function EnquiryStepNeed({ draft, setDraft }) {
  return (
    <div className="enquiry-step">
      <OptionGrid
        name="Need"
        options={REQUEST_TYPES}
        value={draft.requestType}
        onChange={(requestType) => setDraft((d) => ({ ...d, requestType }))}
      />
      {draft.requestType === 'Other' ? (
        <Field label="Tell us more" required>
          <input
            value={draft.requestTypeOther}
            onChange={(e) => setDraft((d) => ({ ...d, requestTypeOther: e.target.value }))}
          />
        </Field>
      ) : null}
    </div>
  )
}

export function EnquiryStepQuantity({ draft, setDraft, product }) {
  const minQty = Number(product?.minimumQuantity) || 1
  const qty = parseQty(draft.servings)
  const total = estimateLine(product, draft.servings)
  const fromHint = !canAutoPrice(product) ? customerPrice(product) : null

  function bump(delta) {
    const current = Number.isFinite(qty) ? qty : minQty
    const next = Math.max(minQty, current + delta)
    setDraft((d) => applyQty(product, d, String(next)))
  }

  return (
    <div className="enquiry-step">
      <p className="enquiry-hint">How many pieces / brownies do you need?</p>
      <div className="qty-stepper">
        <button type="button" onClick={() => bump(-1)} aria-label="Less">
          −
        </button>
        <input
          inputMode="numeric"
          value={draft.servings}
          onChange={(e) => setDraft((d) => applyQty(product, d, e.target.value.replace(/[^\d]/g, '')))}
        />
        <button type="button" onClick={() => bump(1)} aria-label="More">
          +
        </button>
      </div>
      <p className="enquiry-hint">Minimum {minQty}</p>
      {total != null ? <p className="price-live">{formatPrice(total)}</p> : null}
      {fromHint && fromHint.kind === 'from' ? <p className="enquiry-hint">{fromHint.label} each</p> : null}
      <Field label="Flavour / note">
        <textarea
          rows={2}
          value={draft.otherRequirements}
          onChange={(e) => setDraft((d) => ({ ...d, otherRequirements: e.target.value }))}
          placeholder="Classic, nutty, gift wrap…"
        />
      </Field>
    </div>
  )
}

export function EnquiryStepOccasion({ draft, setDraft }) {
  return (
    <div className="enquiry-step">
      <OptionGrid
        name="Occasion"
        options={OCCASIONS}
        value={draft.occasion}
        onChange={(occasion) => setDraft((d) => ({ ...d, occasion }))}
      />
      {draft.occasion === 'Other' ? (
        <Field label="Tell us the occasion" required>
          <input
            value={draft.occasionOther}
            onChange={(e) => setDraft((d) => ({ ...d, occasionOther: e.target.value }))}
          />
        </Field>
      ) : null}
    </div>
  )
}

export function EnquiryStepRequirements({ draft, setDraft }) {
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))
  const listed = CAKE_SIZES.includes(draft.cakeSize)
  const otherOn = Boolean(draft.sizeOther) || Boolean(draft.cakeSize && !listed)

  return (
    <div className="enquiry-step">
      <p className="enquiry-hint">Same details you’d send in an Instagram DM for a cake order.</p>
      <div className="enquiry-field">
        <span>
          Weight / size <i aria-hidden="true">*</i>
        </span>
        <OptionGrid
          name="Size"
          options={[...CAKE_SIZES, 'Other']}
          value={listed ? draft.cakeSize : otherOn ? 'Other' : ''}
          onChange={(cakeSize) =>
            setDraft((d) => ({
              ...d,
              sizeOther: cakeSize === 'Other',
              cakeSize: cakeSize === 'Other' ? '' : cakeSize,
            }))
          }
        />
        {otherOn ? (
          <input
            className="enquiry-other"
            value={draft.cakeSize}
            onChange={set('cakeSize')}
            placeholder="e.g. 1.5 kg / 6 inch"
          />
        ) : null}
      </div>

      <div className="enquiry-fields">
        <Field label="Flavour" required>
          <input
            value={draft.flavour}
            onChange={set('flavour')}
            placeholder="Chocolate, red velvet, vanilla…"
          />
        </Field>
        <div className="enquiry-field">
          <span>
            Egg <i aria-hidden="true">*</i>
          </span>
          <OptionGrid
            name="Egg"
            options={EGG_REQUIRED}
            value={draft.eggPreference}
            onChange={(eggPreference) => setDraft((d) => ({ ...d, eggPreference }))}
          />
        </div>
        <Field label="Theme / vibe">
          <input
            value={draft.theme}
            onChange={set('theme')}
            placeholder="From a reel/post — e.g. cartoon, floral, minimal"
          />
        </Field>
        <Field label="Message on cake">
          <input
            value={draft.messageOnCake}
            onChange={set('messageOnCake')}
            placeholder="Happy Birthday Riya…"
          />
        </Field>
        <Field label="Colours">
          <input
            value={draft.colourPreference || draft.shape}
            onChange={(e) => setDraft((d) => ({ ...d, colourPreference: e.target.value }))}
            placeholder="Pink, pastel, gold…"
          />
        </Field>
        <Field label="Anything else">
          <textarea
            rows={2}
            value={draft.otherRequirements}
            onChange={set('otherRequirements')}
            placeholder="Allergies, toppers, extra details…"
          />
        </Field>
      </div>
    </div>
  )
}

/** Bouquet / chocolate brief — matches IG gift orders. */
export function EnquiryStepGiftDetails({ draft, setDraft }) {
  return (
    <div className="enquiry-step">
      <p className="enquiry-hint">Bouquet or chocolate gift — colours, size feel, and message.</p>
      <div className="enquiry-fields">
        <Field label="Colours / flowers" required>
          <input
            value={draft.colourPreference}
            onChange={(e) => setDraft((d) => ({ ...d, colourPreference: e.target.value }))}
            placeholder="Roses, soft pink, mixed pastels…"
          />
        </Field>
        <Field label="What should we make?" required>
          <textarea
            rows={3}
            value={draft.otherRequirements}
            onChange={(e) => setDraft((d) => ({ ...d, otherRequirements: e.target.value }))}
            placeholder="Flower count feel, treat mix, chocolate flavours…"
          />
        </Field>
        <Field label="Card message">
          <input
            value={draft.messageOnCake}
            onChange={(e) => setDraft((d) => ({ ...d, messageOnCake: e.target.value }))}
            placeholder="Optional note for the gift"
          />
        </Field>
      </div>
    </div>
  )
}

export function EnquiryStepReference({ draft, setDraft, referenceFile, setReferenceFile, previewUrl }) {
  return (
    <div className="enquiry-step">
      <p className="enquiry-hint">
        Screenshot a reel or post you love — or upload a photo. Helps us match the vibe.
      </p>
      <div className="menu-photos">
        {previewUrl ? (
          <div className="menu-photo">
            <img src={previewUrl} alt="" />
            <button type="button" onClick={() => setReferenceFile(null)} aria-label="Remove">
              ×
            </button>
          </div>
        ) : (
          <label className="menu-photo menu-photo--add">
            <span>+</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => setReferenceFile(e.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>
      <Field label="What you like about it">
        <textarea
          rows={2}
          value={draft.referenceNotes}
          onChange={(e) => setDraft((d) => ({ ...d, referenceNotes: e.target.value }))}
          placeholder="Colours, height, toppers…"
        />
      </Field>
    </div>
  )
}

/** Needed-by date + time window (IG order “date?”). */
export function EnquiryStepDate({ draft, setDraft, minimumPreorderDays }) {
  const minDate = getMinPreferredDateISO(minimumPreorderDays)
  return (
    <div className="enquiry-step">
      <Field label={`Needed by · earliest ${formatDisplayDate(minDate)}`} required>
        <input
          type="date"
          min={minDate}
          value={draft.preferredDate}
          onChange={(e) => setDraft((d) => ({ ...d, preferredDate: e.target.value }))}
          required
        />
      </Field>
      <OptionGrid
        name="Time"
        options={DELIVERY_TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
        value={draft.preferredTime}
        onChange={(preferredTime) => setDraft((d) => ({ ...d, preferredTime }))}
      />
    </div>
  )
}

export function EnquiryStepFulfillment({ draft, setDraft }) {
  const setAddress = (key) => (e) =>
    setDraft((d) => ({
      ...d,
      deliveryAddress: {
        ...d.deliveryAddress,
        [key]: key === 'pincode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value,
      },
    }))

  const areaListed = SERVICE_AREAS.includes(draft.deliveryAddress.area)
  const areaOther = Boolean(draft.areaOther) || Boolean(draft.deliveryAddress.area && !areaListed)

  return (
    <div className="enquiry-step">
      <OptionGrid
        name="Handover"
        options={FULFILLMENT_TYPES}
        value={draft.fulfillmentType}
        onChange={(fulfillmentType) => setDraft((d) => ({ ...d, fulfillmentType }))}
      />
      {draft.fulfillmentType === 'delivery' ? (
        <div className="enquiry-fields">
          <p className="enquiry-hint">We deliver around Red Hills / Korattur — charges confirmed on WhatsApp.</p>
          <div className="enquiry-field">
            <span>
              Area <i aria-hidden="true">*</i>
            </span>
            <OptionGrid
              name="Area"
              options={SERVICE_AREAS.map((a) => ({ value: a, label: a }))}
              value={areaListed ? draft.deliveryAddress.area : areaOther ? 'Other' : ''}
              onChange={(area) =>
                setDraft((d) => ({
                  ...d,
                  areaOther: area === 'Other',
                  deliveryAddress: {
                    ...d.deliveryAddress,
                    area: area === 'Other' ? '' : area,
                  },
                }))
              }
            />
            {areaOther ? (
              <input
                className="enquiry-other"
                value={draft.deliveryAddress.area}
                onChange={setAddress('area')}
                placeholder="Your area"
              />
            ) : null}
          </div>
          <Field label="Full address" required>
            <textarea
              rows={2}
              value={draft.deliveryAddress.address}
              onChange={setAddress('address')}
              placeholder="Street, landmark…"
            />
          </Field>
          <Field label="Pincode" required>
            <input
              inputMode="numeric"
              value={draft.deliveryAddress.pincode}
              onChange={setAddress('pincode')}
              maxLength={6}
            />
          </Field>
        </div>
      ) : (
        <div className="enquiry-fields">
          <p className="enquiry-hint">Pickup in Red Hills or Korattur — we’ll confirm the exact spot.</p>
          <OptionGrid
            name="Pickup"
            options={PICKUP_POINTS.map((p) => ({ value: p, label: p }))}
            value={draft.pickupPoint || ''}
            onChange={(pickupPoint) => setDraft((d) => ({ ...d, pickupPoint }))}
          />
        </div>
      )}
    </div>
  )
}

export function EnquiryStepContact({ draft, setDraft }) {
  return (
    <div className="enquiry-step">
      <div className="enquiry-fields">
        <Field label="Your name" required>
          <input
            value={draft.customerName}
            onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="WhatsApp" required>
          <input
            value={draft.customerPhone}
            onChange={(e) => setDraft((d) => ({ ...d, customerPhone: e.target.value }))}
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </Field>
      </div>
    </div>
  )
}

export function EnquiryStepReview({ draft, previewUrl }) {
  const need = draft.requestType === 'Other' ? draft.requestTypeOther : draft.requestType
  const occasion = draft.occasion === 'Other' ? draft.occasionOther : draft.occasion
  const egg = EGG_REQUIRED.find((o) => o.value === draft.eggPreference)?.label || ''
  const isGift = /bouquet|chocolate|brownie box/i.test(String(draft.productName || need || ''))
  const handoff = draft.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'
  const address =
    draft.fulfillmentType === 'delivery'
      ? [draft.deliveryAddress.address, draft.deliveryAddress.area, draft.deliveryAddress.pincode]
          .filter(Boolean)
          .join(', ')
      : ''

  if (isGift) {
    return (
      <div className="enquiry-step">
        <Block>
          <Fact icon={Sparkles} label="Gift" value={draft.productName || need} />
          <Fact icon={Hash} label="Note" value={draft.otherRequirements} />
        </Block>
        <Block>
          <Fact
            icon={Package}
            label="When"
            value={[
              draft.preferredDate ? formatDisplayDate(draft.preferredDate) : '',
              draft.preferredTime,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          <Fact icon={StickyNote} label="Colours" value={draft.otherRequirements} />
          <Fact icon={StickyNote} label="Note" value={draft.referenceNotes} />
        </Block>
        <VisifyNote />
      </div>
    )
  }

  return (
    <div className="enquiry-step">
      <Block>
        <Fact icon={Sparkles} label="Need" value={draft.productName || need} />
        <Fact icon={PartyPopper} label="Occasion" value={occasion} />
      </Block>
      <Block>
        <Fact icon={Scaling} label="Size" value={draft.cakeSize} />
        <Fact icon={Hash} label="Qty" value={draft.otherRequirements} />
        <Fact icon={IceCreamCone} label="Flavour" value={draft.flavour} />
        <Fact icon={Egg} label="Egg" value={egg} />
        <Fact icon={Shapes} label="Shape" value={draft.shape} />
        <Fact icon={Sparkles} label="Theme" value={draft.theme} />
        <Fact icon={Palette} label="Colour" value={draft.colourPreference} />
        <Fact icon={Type} label="On cake" value={draft.messageOnCake} />
      </Block>
      <Block>
        <Fact
          icon={draft.fulfillmentType === 'delivery' ? Truck : Package}
          label="Hand over"
          value={`${handoff}${draft.preferredDate ? ` · ${formatDisplayDate(draft.preferredDate)}` : ''}${draft.preferredTime ? ` · ${draft.preferredTime}` : ''}`}
        />
        <Fact icon={MapPin} label="Address" value={address} />
        <Fact icon={StickyNote} label="Note" value={draft.otherRequirements || draft.referenceNotes} />
      </Block>
      {draft.autoPriced && draft.quotedPrice != null ? (
        <div className="job-block job-block--money">
          <div className="price-split">
            <div>
              <span>Total</span>
              <strong>{formatPrice(draft.quotedPrice)}</strong>
            </div>
          </div>
        </div>
      ) : null}
      {previewUrl ? <img className="job-hero__ref" src={previewUrl} alt="" /> : null}
      <VisifyNote />
    </div>
  )
}
