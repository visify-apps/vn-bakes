import { canAutoPrice, lineTotal } from './autoPrice'
import { formatPrice } from './pricing'
import {
  ALLOWED_REFERENCE_TYPES,
  MAX_REFERENCE_IMAGE_BYTES,
} from '../data/enquiryOptions'
import { isGiftCategory } from '../services/firestore/catalogue'
import { isLikelyIndianMobile } from './validation'

const PIECE_CATEGORIES = new Set(['brownies'])
const MAX_QTY = 200

export const CAKE_SIZES = ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '2.5 kg', '3 kg', '4 kg', '5 kg', 'Bento']

export function isProductOffered(product) {
  return Boolean(product && product.available !== false)
}

export function isGiftProduct(product) {
  if (!product) return false
  return isGiftCategory(product.categoryId)
}

/** Piece items: brownies / any fixed unit price. Cakes & gifts are quoted. */
export function isPieceItem(product) {
  if (!product) return false
  if (isGiftProduct(product)) return false
  if (canAutoPrice(product)) return true
  if (PIECE_CATEGORIES.has(product.categoryId)) return true
  return Boolean(product.minimumQuantity) && !product.requiresCustomEnquiry && product.priceType !== 'enquiry'
}

export function getFlowMode(product) {
  if (!product) return 'custom'
  if (!isProductOffered(product)) return 'unavailable'
  if (isGiftProduct(product)) return 'gift'
  if (isPieceItem(product)) return 'piece'
  return 'cake'
}

export function customerPrice(product) {
  if (!product || product.priceType === 'enquiry' || product.basePrice == null || product.basePrice === '') {
    return { kind: 'ask', label: 'We’ll quote', short: 'Quote' }
  }
  const money = formatPrice(product.basePrice)
  if (product.priceType === 'starting_from') {
    return { kind: 'from', label: `From ${money}`, short: `From ${money}` }
  }
  return { kind: 'fixed', label: money, short: money }
}

export function estimateLine(product, qty) {
  if (!canAutoPrice(product)) return null
  return lineTotal(product.basePrice, qty)
}

export function parseQty(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (!/^\d+$/.test(raw)) return NaN
  return Number(raw)
}

export function validateStep(stepId, draft, options = {}) {
  const { minimumPreorderDays = 3, referenceFile = null, product = null, mode = getFlowMode(product) } = options

  if (mode === 'unavailable') return 'This item is not on the menu.'

  switch (stepId) {
    case 'need': {
      if (!draft.requestType) return 'Choose what you would like.'
      if (draft.requestType === 'Other' && !draft.requestTypeOther?.trim()) {
        return 'Tell us what you would like.'
      }
      return ''
    }
    case 'occasion': {
      if (!draft.occasion) return 'Choose an occasion.'
      if (draft.occasion === 'Other' && !draft.occasionOther?.trim()) {
        return 'Tell us the occasion.'
      }
      return ''
    }
    case 'requirements': {
      if (!String(draft.cakeSize || '').trim()) return 'Choose a size.'
      if (!String(draft.flavour || '').trim()) return 'Add a flavour.'
      if (draft.eggPreference !== 'eggless' && draft.eggPreference !== 'egg') {
        return 'Choose eggless or with egg.'
      }
      return ''
    }
    case 'gift-details': {
      if (!String(draft.otherRequirements || '').trim() && !String(draft.colourPreference || '').trim()) {
        return 'Tell us colours, size feel, or anything special.'
      }
      return ''
    }
    case 'quantity': {
      const qty = parseQty(draft.servings)
      const min = Number(product?.minimumQuantity) || 1
      if (qty == null) return 'Enter how many you need.'
      if (!Number.isFinite(qty) || qty < 1) return 'Quantity must be a whole number.'
      if (qty < min) return `Minimum is ${min}.`
      if (qty > MAX_QTY) return `Maximum is ${MAX_QTY} in one enquiry.`
      return ''
    }
    case 'reference': {
      if (!referenceFile) return ''
      if (!ALLOWED_REFERENCE_TYPES.includes(referenceFile.type)) {
        return 'Use a JPG, PNG, or WebP photo.'
      }
      if (referenceFile.size > MAX_REFERENCE_IMAGE_BYTES) {
        return 'Photo must be under 5 MB.'
      }
      return ''
    }
    case 'date': {
      if (!draft.preferredDate) return 'Pick a date.'
      const min = new Date()
      min.setHours(0, 0, 0, 0)
      min.setDate(min.getDate() + Number(minimumPreorderDays || 3))
      const y = min.getFullYear()
      const m = String(min.getMonth() + 1).padStart(2, '0')
      const d = String(min.getDate()).padStart(2, '0')
      if (draft.preferredDate < `${y}-${m}-${d}`) {
        return `We need ${minimumPreorderDays} days to bake.`
      }
      if (!String(draft.preferredTime || '').trim()) return 'Pick a delivery / pickup time.'
      return ''
    }
    case 'fulfillment': {
      if (draft.fulfillmentType !== 'pickup' && draft.fulfillmentType !== 'delivery') {
        return 'Choose pickup or delivery.'
      }
      if (draft.fulfillmentType !== 'delivery') return ''
      if (!draft.deliveryAddress?.address?.trim()) return 'Enter the street address.'
      if (!draft.deliveryAddress?.area?.trim()) return 'Enter the area.'
      const pin = String(draft.deliveryAddress?.pincode || '').replace(/\s/g, '')
      if (!pin) return 'Enter the pincode.'
      if (!/^\d{6}$/.test(pin)) return 'Pincode must be 6 digits.'
      return ''
    }
    case 'contact': {
      if (!draft.customerName?.trim()) return 'Enter your name.'
      if (!draft.customerPhone?.trim()) return 'Enter your WhatsApp number.'
      if (!isLikelyIndianMobile(draft.customerPhone)) {
        return 'Enter a 10-digit Indian mobile.'
      }
      return ''
    }
    case 'review': {
      const path =
        mode === 'piece'
          ? ['quantity', 'date', 'fulfillment', 'contact']
          : mode === 'gift'
            ? ['class-details', 'class-date', 'contact']
            : mode === 'cake'
              ? ['occasion', 'requirements', 'reference', 'date', 'fulfillment', 'contact']
              : ['need', 'occasion', 'requirements', 'reference', 'date', 'fulfillment', 'contact']
      for (const id of path) {
        const error = validateStep(id, draft, options)
        if (error) return error
      }
      return ''
    }
    default:
      return ''
  }
}
