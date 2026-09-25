/**
 * Enquiry options tuned to VN Bakes Instagram (@vn__bakes__) order DMs:
 * custom cakes · brownies · bouquets · chocolates — Red Hills / Korattur.
 */

export const REQUEST_TYPES = [
  'Custom Cake',
  'Theme Cake',
  'Brownies',
  'Bouquet',
  'Chocolates',
  'Other',
]

export const OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Friendship Day',
  'Proposal / Surprise',
  'Thank you',
  'Just because',
  'Festival',
  'Other',
]

export const EGG_OPTIONS = [
  { value: 'eggless', label: 'Eggless' },
  { value: 'egg', label: 'With egg' },
]

export const FULFILLMENT_TYPES = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
]

/** Areas they serve around Red Hills / Korattur (from IG location). */
export const SERVICE_AREAS = [
  'Red Hills',
  'Korattur',
  'Ambattur',
  'Padi',
  'Anna Nagar',
  'Other',
]

export const DELIVERY_TIME_SLOTS = [
  'Morning (9–12)',
  'Afternoon (12–4)',
  'Evening (4–8)',
  'Exact time on WhatsApp',
]

export const PICKUP_POINTS = ['Red Hills', 'Korattur', 'We’ll confirm on WhatsApp']

export const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_REFERENCE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export function createEmptyEnquiryDraft() {
  return {
    requestType: '',
    requestTypeOther: '',
    occasion: '',
    occasionOther: '',
    cakeSize: '',
    servings: '',
    flavour: '',
    eggPreference: '',
    shape: '',
    theme: '',
    colourPreference: '',
    messageOnCake: '',
    age: '',
    otherRequirements: '',
    referenceNotes: '',
    preferredDate: '',
    preferredTime: '',
    fulfillmentType: 'pickup',
    pickupPoint: '',
    deliveryAddress: {
      address: '',
      area: '',
      pincode: '',
      notes: '',
    },
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    productId: null,
    productName: null,
    quotedPrice: null,
    advanceRequired: null,
    balanceAmount: null,
    autoPriced: false,
    priceLocked: false,
  }
}

/** Map product category / name hints into requestType (IG menu language). */
export function inferRequestTypeFromProduct(product) {
  if (!product) return 'Custom Cake'
  const cat = String(product.categoryId || '').toLowerCase()
  const name = String(product.name || '').toLowerCase()
  if (cat === 'brownies' || name.includes('brownie')) return 'Brownies'
  if (cat === 'chocolates' || name.includes('chocolate')) return 'Chocolates'
  if (cat === 'bouquets' || name.includes('bouquet') || name.includes('flower')) return 'Bouquet'
  if (cat.includes('theme') || name.includes('theme')) return 'Theme Cake'
  if (product.requiresCustomEnquiry || product.priceType === 'enquiry') return 'Custom Cake'
  return 'Custom Cake'
}
