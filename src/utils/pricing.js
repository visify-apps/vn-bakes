/**
 * @param {number | null | undefined} amount
 * @param {string} [currency]
 */
export function formatPrice(amount, currency = 'INR') {
  if (amount == null || Number.isNaN(Number(amount))) return null
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount))
  } catch {
    return `₹${amount}`
  }
}

/**
 * @param {{ priceType?: string, basePrice?: number | null }} product
 * @param {string} [currency]
 */
export function formatProductPrice(product, currency = 'INR') {
  const formatted = formatPrice(product?.basePrice, currency)
  if (product?.priceType === 'enquiry' || !formatted) return 'Enquiry'
  if (product?.priceType === 'starting_from') return `From ${formatted}`
  return formatted
}
