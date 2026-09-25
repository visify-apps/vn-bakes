/**
 * App configuration from Vite env.
 * Firebase web keys are public client config — never put service accounts here.
 */

function requiredEnv(name, fallback = '') {
  const value = import.meta.env[name] ?? fallback
  return typeof value === 'string' ? value.trim() : ''
}

export const appConfig = {
  defaultBusinessId: requiredEnv('VITE_DEFAULT_BUSINESS_ID', 'vn-bakes'),
  basePath: requiredEnv('VITE_BASE_PATH', '/'),
  /** Standalone Visify desk (never hosted on a shop Pages URL). */
  visifyDeskUrl: requiredEnv('VITE_VISIFY_DESK_URL', 'https://visify-apps.github.io/visify-desk/'),
  /** Off by default — Firebase Storage often needs Blaze; WhatsApp can carry reference photos. */
  enableFirebaseStorage: requiredEnv('VITE_ENABLE_FIREBASE_STORAGE', 'false') === 'true',
  firebase: {
    apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: requiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requiredEnv('VITE_FIREBASE_APP_ID'),
  },
}

export function isFirebaseConfigured() {
  const { apiKey, projectId, appId } = appConfig.firebase
  return Boolean(apiKey && projectId && appId && apiKey !== 'demo-api-key')
}

export function isFirebaseStorageEnabled() {
  return isFirebaseConfigured() && appConfig.enableFirebaseStorage
}

export function openVisifyDesk() {
  const base = (appConfig.visifyDeskUrl || 'https://visify-apps.github.io/visify-desk/').replace(/\/?$/, '/')
  window.location.assign(`${base}#/visify`)
}
