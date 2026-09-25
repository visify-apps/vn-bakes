import { createEmptyEnquiryDraft, inferRequestTypeFromProduct } from './enquiryOptions'
import { getFlowMode } from '../utils/enquiryRules'

const CAKE_STEPS = [
  { id: 'occasion', title: 'What’s the occasion?', short: 'Occasion' },
  { id: 'requirements', title: 'Tell us the cake', short: 'Cake' },
  { id: 'reference', title: 'A photo helps', short: 'Photo' },
  { id: 'date', title: 'When do you need it?', short: 'Date' },
  { id: 'fulfillment', title: 'Pickup or delivery?', short: 'Handover' },
  { id: 'contact', title: 'How can we reach you?', short: 'You' },
  { id: 'review', title: 'Looks right?', short: 'Check' },
]

const PIECE_STEPS = [
  { id: 'quantity', title: 'How many?', short: 'Qty' },
  { id: 'date', title: 'When do you need it?', short: 'Date' },
  { id: 'fulfillment', title: 'Pickup or delivery?', short: 'Handover' },
  { id: 'contact', title: 'How can we reach you?', short: 'You' },
  { id: 'review', title: 'Looks right?', short: 'Check' },
]

/** Bouquets / chocolates — occasion + brief, not cake size/egg. */
const GIFT_STEPS = [
  { id: 'occasion', title: 'What’s the occasion?', short: 'Occasion' },
  { id: 'gift-details', title: 'Tell us about the gift', short: 'Gift' },
  { id: 'reference', title: 'A photo helps', short: 'Photo' },
  { id: 'date', title: 'When do you need it?', short: 'Date' },
  { id: 'fulfillment', title: 'Pickup or delivery?', short: 'Handover' },
  { id: 'contact', title: 'How can we reach you?', short: 'You' },
  { id: 'review', title: 'Looks right?', short: 'Check' },
]

const CUSTOM_STEPS = [
  { id: 'need', title: 'What would you like?', short: 'Need' },
  ...CAKE_STEPS,
]

export function getEnquiryFlow(product) {
  const mode = getFlowMode(product)
  if (mode === 'unavailable') {
    return { mode, steps: [], title: 'Unavailable' }
  }
  if (mode === 'gift') {
    return { mode, steps: GIFT_STEPS, title: product.name }
  }
  if (mode === 'piece') {
    return { mode, steps: PIECE_STEPS, title: product.name }
  }
  if (mode === 'cake') {
    return { mode, steps: CAKE_STEPS, title: product.name }
  }
  return { mode: 'custom', steps: CUSTOM_STEPS, title: 'Your order' }
}

export function buildDraftFromProduct(product, existing = createEmptyEnquiryDraft()) {
  if (!product) return existing
  const servings =
    existing.servings ||
    (product.minimumQuantity ? String(product.minimumQuantity) : existing.servings)
  const requestType = inferRequestTypeFromProduct(product)
  const giftLike = ['Brownies', 'Chocolates', 'Bouquet', 'Flower Bouquet', 'Treat Bouquet'].includes(
    requestType,
  )
  return {
    ...existing,
    productId: product.id,
    productName: product.name,
    requestType,
    flavour: giftLike ? existing.flavour || '' : existing.flavour || product.name,
    servings,
    fulfillmentType: existing.fulfillmentType || 'pickup',
  }
}
