/**
 * Enquiry options for VN Bakes Instagram intake (cakes, brownies, chocolates, bouquets).
 */

export const REQUEST_TYPES = [
  'Custom Cake',
  'Theme Cake',
  'Brownies',
  'Chocolates',
  'Flower Bouquet',
  'Treat Bouquet',
  'Other',
]

export const OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Friendship',
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

export const DELIVERY_TIME_SLOTS = [
  'Morning (9–12)',
  'Afternoon (12–4)',
  'Evening (4–8)',
  'Exact time on WhatsApp',
]

export const CLASS_TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Flexible']

export const ENQUIRY_STEPS = [
  { id: 'need', title: 'Need', short: 'Need' },
  { id: 'occasion', title: 'Occasion', short: 'Occasion' },
  { id: 'requirements', title: 'Details', short: 'Details' },
  { id: 'reference', title: 'Photo', short: 'Photo' },
  { id: 'date', title: 'When', short: 'When' },
  { id: 'fulfillment', title: 'Handover', short: 'Handover' },
  { id: 'contact', title: 'You', short: 'You' },
  { id: 'review', title: 'Check', short: 'Check' },
]

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

/** Map product category / name hints into requestType */
export function inferRequestTypeFromProduct(product) {
  if (!product) return 'Custom Cake'
  const cat = String(product.categoryId || '').toLowerCase()
  const name = String(product.name || '').toLowerCase()
  if (cat === 'brownies' || name.includes('brownie')) return 'Brownies'
  if (cat === 'chocolates' || name.includes('chocolate')) return 'Chocolates'
  if (name.includes('treat bouquet') || (cat === 'bouquets' && name.includes('treat'))) {
    return 'Treat Bouquet'
  }
  if (cat === 'bouquets' || name.includes('bouquet') || name.includes('flower')) {
    return 'Flower Bouquet'
  }
  if (cat.includes('theme') || name.includes('theme')) return 'Theme Cake'
  if (product.requiresCustomEnquiry || product.priceType === 'enquiry') return 'Custom Cake'
  return 'Custom Cake'
}
