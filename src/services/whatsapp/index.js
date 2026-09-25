/**
 * WhatsApp click-to-chat helpers (MVP — no Business API).
 * Website holds the full brief; WhatsApp confirms success and asks the baker to check the ID.
 */

/**
 * @param {string} phone - Digits with country code preferred (e.g. 9198xxxxxxxx)
 * @param {string} [message]
 * @returns {string}
 */
export function generateWhatsAppLink(phone, message = '') {
  const digits = String(phone || '').replace(/\D/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  if (!digits) return message ? `https://wa.me/${text}` : '#'
  return `https://wa.me/${digits}${text}`
}

function eggLabel(value) {
  if (value === 'eggless') return 'Eggless'
  if (value === 'egg') return 'With egg'
  return value || ''
}

function handoffLabel(enquiry) {
  if (enquiry.fulfillmentType === 'delivery') {
    const place = [enquiry.deliveryAddress?.area, enquiry.deliveryAddress?.pincode]
      .filter(Boolean)
      .join(' ')
    return place ? `Delivery · ${place}` : 'Delivery'
  }
  if (enquiry.fulfillmentType === 'pickup') return 'Pickup'
  return ''
}

function qtyLabel(enquiry) {
  const raw = String(enquiry.servings || '').trim()
  if (!raw) return ''
  if (/kg|pcs|piece|bento/i.test(raw)) return raw
  if (enquiry.cakeSize) return raw
  return `${raw} pcs`
}

function isGiftEnquiry(enquiry) {
  const type = String(enquiry.requestType || '')
  const name = String(enquiry.productName || '')
  return /bouquet|chocolate/i.test(type) || /bouquet|chocolate/i.test(name)
}

function compact(lines) {
  return lines
    .filter((line, index, arr) => {
      if (line !== '') return true
      return index > 0 && index < arr.length - 1 && arr[index - 1] !== ''
    })
    .join('\n')
    .trim()
}

/** Deep link for admin UI only — not used in customer WhatsApp pings. */
export function enquiryAdminUrl(enquiryId) {
  if (!enquiryId || typeof window === 'undefined') return ''
  const { origin, pathname } = window.location
  const basePath = pathname.replace(/\/index\.html$/i, '')
  const root = `${origin}${basePath}`.replace(/\/?$/, '/')
  return `${root}#/admin/enquiries/${enquiryId}`
}

/**
 * Customer → baker: order succeeded on website, please check this ID there.
 * Short summary for context — no admin URL (baker uses the ID in admin).
 */
export function buildEnquiryContinuationMessage(enquiry, business = {}) {
  const baker = business.whatsappGreetingName || business.displayName || 'there'
  const id = enquiry.enquiryNumber || enquiry.id || ''
  const who = enquiry.customerSnapshot?.name || ''
  const when = [enquiry.preferredDateLabel, enquiry.preferredTime].filter(Boolean).join(' · ')

  const opener = [
    `Hi ${baker},`,
    `Enquiry ${id} submitted successfully on your website.`,
    'Please open it in admin with this ID and check the details.',
    '',
  ]

  if (isGiftEnquiry(enquiry)) {
    const className = enquiry.productName || 'Gift'
    return compact([
      ...opener,
      who ? `I'm ${who}.` : '',
      `Gift: ${className}`,
      enquiry.colourPreference ? `Colours: ${enquiry.colourPreference}` : '',
      when ? `Preferred: ${when}` : '',
      enquiry.otherRequirements ? `Learn: ${enquiry.otherRequirements}` : '',
      enquiry.referenceNotes || '',
    ])
  }

  const cake = enquiry.productName || enquiry.requestType || 'Cake enquiry'
  const spec = [enquiry.flavour, enquiry.cakeSize, qtyLabel(enquiry), eggLabel(enquiry.eggPreference)]
    .filter(Boolean)
    .join(' · ')
  const extras = [enquiry.theme, enquiry.colourPreference, enquiry.shape].filter(Boolean).join(' · ')
  const photo = enquiry.referenceImageUrl
    ? 'Reference photo is on the website enquiry.'
    : enquiry.referenceDeferredToWhatsApp || enquiry.referenceFileName
      ? 'I can send a reference photo here if needed.'
      : ''

  return compact([
    ...opener,
    who ? `I'm ${who}.` : '',
    cake,
    enquiry.occasion,
    spec,
    extras,
    enquiry.messageOnCake ? `On cake: ${enquiry.messageOnCake}` : '',
    [when, handoffLabel(enquiry)].filter(Boolean).join(' · '),
    enquiry.fulfillmentType === 'delivery'
      ? [enquiry.deliveryAddress?.address, enquiry.deliveryAddress?.area, enquiry.deliveryAddress?.pincode]
          .filter(Boolean)
          .join(', ')
      : '',
    enquiry.quotedPrice != null && enquiry.autoPriced ? `Total ₹${enquiry.quotedPrice}` : '',
    enquiry.otherRequirements || enquiry.referenceNotes || '',
    photo,
  ])
}

export function enquiryWhatsAppUrl(enquiry, business = {}) {
  const phone = business.whatsappNumber || business.phone
  return generateWhatsAppLink(phone, buildEnquiryContinuationMessage(enquiry, business))
}

export const AFTER_ENQUIRY_HOME_KEY = 'ck_after_enquiry'

function publicHomeHref() {
  const { pathname, search } = window.location
  return `${pathname}${search}#/`
}

/** Drop the enquiry page from history so Back from WhatsApp lands on Home. */
export function replaceEnquiryWithHome() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(AFTER_ENQUIRY_HOME_KEY, 'home')
  } catch {
    // ignore
  }
  window.history.replaceState(window.history.state, '', publicHomeHref())
}

export function openEnquiryOnWhatsApp(enquiry, business = {}) {
  const url = enquiryWhatsAppUrl(enquiry, business)
  if (!url || url === '#') return null
  if (typeof window !== 'undefined') {
    replaceEnquiryWithHome()
    window.location.assign(url)
  }
  return url
}

/**
 * Quote share — clear confirm ask, still no long admin URL.
 */
export function buildQuotationMessage(enquiry, opts = {}) {
  const name = opts.customerFirstName || 'there'
  const id = enquiry.enquiryNumber || ''
  const item = enquiry.productName || enquiry.requestType || 'your order'
  return compact([
    `Hi ${name},`,
    `Quote for enquiry ${id}:`,
    `${item} — ₹${enquiry.quotedPrice}`,
    `Advance ₹${enquiry.advanceRequired} · Balance ₹${enquiry.balanceAmount}`,
    'Please reply here to confirm.',
  ])
}
