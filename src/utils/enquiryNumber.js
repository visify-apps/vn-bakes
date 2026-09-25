/**
 * Human-readable enquiry numbers.
 * Prefer date + Firestore doc suffix (no public sequential counter).
 */

export function buildEnquiryNumber(docId, date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const suffix = String(docId || 'XXXX')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase()
    .padStart(4, 'X')
  return `BB-${y}${m}${d}-${suffix}`
}
