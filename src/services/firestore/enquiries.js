import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'
import { getFirestoreDb } from '../firebase'
import { buildEnquiryNumber } from '../../utils/enquiryNumber'
import {
  formatDisplayDate,
  resolveOccasionLabel,
  resolveRequestTypeLabel,
  toWhatsAppPhone,
} from '../../utils/enquiry'
import { uploadEnquiryReferenceImage } from '../storage'
import { appendDemoEnquiry } from './adminEnquiries'
import { normalizePhoneDigits } from '../../utils/validation'
import { openEnquiryOnWhatsApp } from '../whatsapp'
import { readSubscription } from './subscription'
import { describeAccess } from '../../utils/subscription'

const SUCCESS_STORAGE_KEY = 'ck_last_enquiry_success'

/**
 * Persist success payload for the confirmation page (survives navigation).
 */
export function saveEnquirySuccessPayload(payload) {
  try {
    sessionStorage.setItem(SUCCESS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

export function readEnquirySuccessPayload() {
  try {
    const raw = sessionStorage.getItem(SUCCESS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function createEnquiryId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  }
  return `enq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Build Firestore-safe enquiry document from draft.
 */
export function buildEnquiryDocument({
  draft,
  businessId,
  enquiryId,
  enquiryNumber,
  submissionToken,
  imageMeta,
}) {
  const phone = toWhatsAppPhone(draft.customerPhone)
  return {
    businessId,
    enquiryNumber,
    submissionToken,
    status: 'NEW',
    customerId: null,
    customerSnapshot: {
      name: draft.customerName.trim(),
      phone,
      phoneLocal: normalizePhoneDigits(draft.customerPhone),
      email: draft.customerEmail?.trim() || null,
    },
    requestType: resolveRequestTypeLabel(draft),
    occasion: resolveOccasionLabel(draft),
    occasionOther: draft.occasion === 'Other' ? draft.occasionOther?.trim() || null : null,
    cakeSize: draft.cakeSize?.trim() || null,
    servings: draft.servings?.trim() || null,
    flavour: draft.flavour?.trim() || null,
    eggPreference: draft.eggPreference || null,
    shape: draft.shape?.trim() || null,
    theme: draft.theme?.trim() || null,
    colourPreference: draft.colourPreference?.trim() || null,
    messageOnCake: draft.messageOnCake?.trim() || null,
    age: draft.age?.trim() || null,
    otherRequirements: draft.otherRequirements?.trim() || null,
    referenceImageUrl: imageMeta?.referenceImageUrl || null,
    referenceImagePath: imageMeta?.referenceImagePath || null,
    referenceFileName: imageMeta?.referenceFileName || null,
    referenceDeferredToWhatsApp: Boolean(imageMeta?.referenceDeferredToWhatsApp),
    referenceNotes: draft.referenceNotes?.trim() || null,
    preferredDate: draft.preferredDate,
    preferredDateLabel: formatDisplayDate(draft.preferredDate),
    preferredTime: draft.preferredTime?.trim() || null,
    fulfillmentType: draft.fulfillmentType,
    deliveryAddress:
      draft.fulfillmentType === 'delivery'
        ? {
            address: draft.deliveryAddress.address.trim(),
            area: draft.deliveryAddress.area.trim(),
            pincode: String(draft.deliveryAddress.pincode || '').replace(/\D/g, ''),
            notes: draft.deliveryAddress.notes?.trim() || null,
          }
        : null,
    productId: draft.productId || null,
    productName: draft.productName || null,
    quotedPrice: draft.autoPriced && draft.quotedPrice != null ? Number(draft.quotedPrice) : null,
    advanceRequired:
      draft.autoPriced && draft.advanceRequired != null ? Number(draft.advanceRequired) : null,
    balanceAmount:
      draft.autoPriced && draft.balanceAmount != null ? Number(draft.balanceAmount) : null,
    autoPriced: Boolean(draft.autoPriced),
    priceLocked: Boolean(draft.priceLocked && draft.autoPriced),
    quotationNotes: null,
    quoteSentAt: null,
    internalNotes: null,
    orderId: null,
    source: 'website',
  }
}

/**
 * Submit enquiry: upload image (optional) → write Firestore (or demo mode).
 * Always continues on WhatsApp after a successful save (custom, cake, or piece).
 * @returns {Promise<{ enquiryId: string, enquiryNumber: string, demo: boolean, enquiry: object, whatsappUrl: string|null }>}
 */
export async function submitEnquiry({ draft, referenceFile, submissionToken, businessId, business }) {
  const resolvedBusinessId = businessId || appConfig.defaultBusinessId
  const access = describeAccess(await readSubscription(resolvedBusinessId))
  if (!access.open) {
    throw new Error('This shop is not taking orders right now.')
  }
  const enquiryId = createEnquiryId()
  const enquiryNumber = buildEnquiryNumber(enquiryId)
  const token = submissionToken

  let imageMeta = null
  if (referenceFile) {
    imageMeta = await uploadEnquiryReferenceImage(referenceFile, {
      businessId: resolvedBusinessId,
      enquiryId,
    })
  }

  const enquiryBody = buildEnquiryDocument({
    draft,
    businessId: resolvedBusinessId,
    enquiryId,
    enquiryNumber,
    submissionToken: token,
    imageMeta,
  })

  const demo = !isFirebaseConfigured()
  const savedEnquiry = {
    ...enquiryBody,
    id: enquiryId,
  }

  if (!demo) {
    const db = getFirestoreDb()
    const ref = doc(db, 'businesses', resolvedBusinessId, 'enquiries', enquiryId)
    await setDoc(ref, {
      ...enquiryBody,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    appendDemoEnquiry(savedEnquiry)
  }

  const result = {
    enquiryId,
    enquiryNumber,
    demo,
    enquiry: savedEnquiry,
  }

  saveEnquirySuccessPayload(result)
  const whatsappUrl = openEnquiryOnWhatsApp(result.enquiry, {
    displayName: business?.displayName,
    whatsappGreetingName: business?.whatsappGreetingName || business?.displayName,
    whatsappNumber: business?.whatsappNumber,
    phone: business?.phone,
  })
  return { ...result, whatsappUrl }
}
