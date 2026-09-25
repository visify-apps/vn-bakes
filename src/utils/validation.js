/**
 * Shared validation helpers.
 */

export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export function isLikelyIndianMobile(phone) {
  const digits = normalizePhoneDigits(phone)
  if (digits.length === 10) return /^[6-9]/.test(digits)
  if (digits.length === 12 && digits.startsWith('91')) return /^91[6-9]/.test(digits)
  return false
}
