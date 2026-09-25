import { appConfig } from '../config/appConfig'

const VISIFY_MAIL = 'visifyapps@gmail.com'

export function reportsEnableMailto({ business, user }) {
  const shopId = business?.businessId || appConfig.defaultBusinessId
  const shopName = business?.displayName || business?.businessName || shopId
  const phone = business?.phone || business?.whatsappNumber || '—'
  const adminEmail = user?.email || '—'
  const subject = `Reports add-on · ${shopName}`
  const body = [
    `Please send the price to enable Reports on our existing plan.`,
    '',
    `Shop id: ${shopId}`,
    `Shop name: ${shopName}`,
    `Phone: ${phone}`,
    `Admin email: ${adminEmail}`,
  ].join('\n')

  return `mailto:${VISIFY_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export { VISIFY_MAIL }
