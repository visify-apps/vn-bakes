/**
 * Auto-pricing only for fixed unit items (brownies, etc.).
 * "From ₹" cakes are a starting hint — never multiply by quantity.
 */

export function canAutoPrice(product) {
  if (!product || product.requiresCustomEnquiry) return false
  if (product.priceType !== 'fixed') return false
  const price = Number(product.basePrice)
  return price > 0
}

export function lineTotal(unitPrice, quantity) {
  const unit = Number(unitPrice) || 0
  const qty = Number(quantity) || 0
  if (unit <= 0 || qty <= 0) return null
  return Math.round(unit * qty)
}

export function suggestedAdvance(total) {
  if (!total || total <= 0) return 0
  return Math.round(total / 2)
}
