import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import {
  appConfig,
  isFirebaseConfigured,
  isFirebaseStorageEnabled,
} from '../../config/appConfig'
import { getFirebaseStorage } from '../firebase'
import {
  ALLOWED_REFERENCE_TYPES,
  MAX_REFERENCE_IMAGE_BYTES,
} from '../../data/enquiryOptions'

/** Stay under Firestore’s 1 MB document limit. */
const MAX_INLINE_CHARS = 700000

function loadImage(file) {
  const src = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ img, src })
    img.onerror = () => {
      URL.revokeObjectURL(src)
      reject(new Error('Could not read the photo.'))
    }
    img.src = src
  })
}

/**
 * Compress a customer photo so the baker can see it without Firebase Storage.
 */
export async function compressReferenceImage(file) {
  const { img, src } = await loadImage(file)
  try {
    const maxEdge = 1280
    const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1))
    let width = Math.max(1, Math.round((img.width || 1) * scale))
    let height = Math.max(1, Math.round((img.height || 1) * scale))
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let quality = 0.74
    let dataUrl = ''

    for (let i = 0; i < 6; i += 1) {
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length <= MAX_INLINE_CHARS) return dataUrl
      quality = Math.max(0.42, quality - 0.12)
      width = Math.max(320, Math.round(width * 0.82))
      height = Math.max(320, Math.round(height * 0.82))
    }

    if (!dataUrl || dataUrl.length > MAX_INLINE_CHARS) {
      throw new Error('Photo is too large. Try a smaller picture.')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(src)
  }
}

/**
 * Store the reference photo for the baker: Storage when enabled, otherwise inline.
 *
 * @param {File} file
 * @param {{ businessId?: string, enquiryId: string }} meta
 */
export async function uploadEnquiryReferenceImage(file, meta) {
  if (!file) return null

  if (!ALLOWED_REFERENCE_TYPES.includes(file.type)) {
    throw new Error('Reference image must be JPG, PNG, or WebP.')
  }
  if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error('Reference image must be 5 MB or smaller.')
  }

  if (isFirebaseStorageEnabled()) {
    const businessId = meta.businessId || appConfig.defaultBusinessId
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
    const path = `businesses/${businessId}/enquiries/${meta.enquiryId}/reference/${Date.now()}_${safeName}`
    const storageRef = ref(getFirebaseStorage(), path)
    await uploadBytes(storageRef, file, { contentType: file.type })
    const url = await getDownloadURL(storageRef)
    return {
      referenceImageUrl: url,
      referenceImagePath: path,
      referenceFileName: file.name,
      referenceDeferredToWhatsApp: false,
      demo: false,
    }
  }

  return {
    referenceImageUrl: await compressReferenceImage(file),
    referenceImagePath: null,
    referenceFileName: file.name,
    referenceDeferredToWhatsApp: false,
    demo: !isFirebaseConfigured(),
  }
}
