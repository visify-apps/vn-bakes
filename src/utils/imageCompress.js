/**
 * Compress images client-side so product photos can be stored in Firestore
 * without Firebase Storage (free Spark-friendly).
 */

const MAX_EDGE = 1200
const JPEG_QUALITY = 0.72
const MAX_DATA_URL_CHARS = 650_000 // ~keep Firestore doc comfortable

/**
 * @param {File} file
 * @returns {Promise<string>} data URL (jpeg/webp/png)
 */
export function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image is too large (max 8 MB before compress).'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        let dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        if (dataUrl.length > MAX_DATA_URL_CHARS) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55)
        }
        if (dataUrl.length > MAX_DATA_URL_CHARS) {
          reject(new Error('Image is still too large after compress. Try a simpler photo.'))
          return
        }
        resolve(dataUrl)
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}
