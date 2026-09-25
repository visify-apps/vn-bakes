import { normalizePhoneDigits, isLikelyIndianMobile } from './validation'
import {
  ALLOWED_REFERENCE_TYPES,
  MAX_REFERENCE_IMAGE_BYTES,
} from '../data/enquiryOptions'
import { validateStep } from './enquiryRules'

/**
 * @param {string} preferredDate - YYYY-MM-DD
 * @param {number} minimumPreorderDays
 */
export function getMinPreferredDateISO(minimumPreorderDays = 4) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + Number(minimumPreorderDays || 4))
  return toISODate(d)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return '—'
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * @param {string} isoDate
 * @param {number} minimumPreorderDays
 */
export function isPreferredDateTooSoon(isoDate, minimumPreorderDays = 4) {
  if (!isoDate) return true
  const min = getMinPreferredDateISO(minimumPreorderDays)
  return isoDate < min
}

/**
 * Validate a single step. Returns error message or empty string.
 */
export function validateEnquiryStep(stepIndex, draft, options = {}) {
  const { minimumPreorderDays = 4, referenceFile = null, mode = 'custom' } = options

  switch (stepIndex) {
    case 0: {
      if (mode !== 'custom') return ''
      if (!draft.requestType) return 'Choose one.'
      if (draft.requestType === 'Other' && !draft.requestTypeOther?.trim()) {
        return 'Say what you need.'
      }
      return ''
    }
    case 1: {
      if (mode === 'product-simple') return ''
      if (!draft.occasion) return 'Choose an occasion.'
      if (draft.occasion === 'Other' && !draft.occasionOther?.trim()) {
        return 'Say the occasion.'
      }
      return ''
    }
    case 2: {
      if (mode === 'product-simple') {
        const qty = Number(draft.servings)
        if (!draft.servings?.trim()) return 'Enter a quantity.'
        if (Number.isNaN(qty) || qty < 1) return 'Enter a quantity.'
      }
      return ''
    }
    case 3: {
      if (referenceFile) {
        if (!ALLOWED_REFERENCE_TYPES.includes(referenceFile.type)) {
          return 'Reference image must be JPG, PNG, or WebP.'
        }
        if (referenceFile.size > MAX_REFERENCE_IMAGE_BYTES) {
          return 'Reference image must be 5 MB or smaller.'
        }
      }
      return ''
    }
    case 4: {
      if (!draft.preferredDate) return 'Pick a date.'
      if (isPreferredDateTooSoon(draft.preferredDate, minimumPreorderDays)) {
        return `Need ${minimumPreorderDays} days notice.`
      }
      return ''
    }
    case 5: {
      if (!draft.fulfillmentType) return 'Choose pickup or delivery.'
      if (draft.fulfillmentType === 'delivery') {
        if (!draft.deliveryAddress?.address?.trim()) return 'Enter the address.'
        if (!draft.deliveryAddress?.area?.trim()) return 'Enter the area.'
        if (!draft.deliveryAddress?.pincode?.trim()) return 'Enter the pin.'
        if (!/^\d{6}$/.test(draft.deliveryAddress.pincode.trim())) {
          return 'Pin should be 6 digits.'
        }
      }
      return ''
    }
    case 6: {
      if (!draft.customerName?.trim()) return 'Enter your name.'
      if (!draft.customerPhone?.trim()) return 'Enter WhatsApp number.'
      if (!isLikelyIndianMobile(draft.customerPhone)) {
        return 'Enter a 10-digit mobile.'
      }
      if (draft.customerEmail?.trim()) {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customerEmail.trim())
        if (!ok) return 'Email looks invalid.'
      }
      return ''
    }
    case 7: {
      if (mode === 'product-simple') {
        return (
          validateEnquiryStep(2, draft, options) ||
          validateEnquiryStep(4, draft, options) ||
          validateEnquiryStep(5, draft, options) ||
          validateEnquiryStep(6, draft, options)
        )
      }
      if (mode === 'product-custom') {
        return (
          validateEnquiryStep(1, draft, options) ||
          validateEnquiryStep(4, draft, options) ||
          validateEnquiryStep(5, draft, options) ||
          validateEnquiryStep(6, draft, options) ||
          validateEnquiryStep(3, draft, options)
        )
      }
      return (
        validateEnquiryStep(0, draft, options) ||
        validateEnquiryStep(1, draft, options) ||
        validateEnquiryStep(4, draft, options) ||
        validateEnquiryStep(5, draft, options) ||
        validateEnquiryStep(6, draft, options) ||
        validateEnquiryStep(3, draft, options)
      )
    }
    default:
      return ''
  }
}

export function validateByStepId(stepId, draft, options = {}) {
  if (stepId === 'product') {
    if (!draft.productId) return 'Pick a cake from the menu.'
    return ''
  }
  return validateStep(stepId, draft, options)
}

export function resolveRequestTypeLabel(draft) {
  if (draft.requestType === 'Other') return draft.requestTypeOther?.trim() || 'Other'
  return draft.requestType
}

export function resolveOccasionLabel(draft) {
  if (draft.occasion === 'Other') return draft.occasionOther?.trim() || 'Other'
  return draft.occasion
}

export function toWhatsAppPhone(phone) {
  const digits = normalizePhoneDigits(phone)
  if (digits.length === 10) return `91${digits}`
  return digits
}

export function createSubmissionToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
