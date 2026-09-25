export function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export function telHref(phone) {
  const digits = phoneDigits(phone)
  if (!digits) return null
  return `tel:+${digits}`
}

export function formatPhone(phone) {
  const digits = phoneDigits(phone)
  if (!digits) return ''
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return `+${digits}`
}
