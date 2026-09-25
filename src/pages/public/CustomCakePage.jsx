import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EnquiryProgress } from '../../components/customer/EnquiryProgress'
import {
  EnquiryStepContact,
  EnquiryStepDate,
  EnquiryStepFulfillment,
  EnquiryStepNeed,
  EnquiryStepOccasion,
  EnquiryStepQuantity,
  EnquiryStepReference,
      EnquiryStepRequirements,
  EnquiryStepGiftDetails,
  EnquiryStepReview,
} from '../../components/customer/EnquirySteps'
import { useBusiness } from '../../context/BusinessContext'
import { useAccess } from '../../context/AccessContext'
import { useProduct } from '../../hooks/useCatalogue'
import { createEmptyEnquiryDraft } from '../../data/enquiryOptions'
import { buildDraftFromProduct, getEnquiryFlow } from '../../data/enquiryFlows'
import { createSubmissionToken } from '../../utils/enquiry'
import { submitEnquiry } from '../../services/firestore/enquiries'
import { suggestedAdvance } from '../../utils/autoPrice'
import { customerPrice, estimateLine, isProductOffered, validateStep } from '../../utils/enquiryRules'
import { useSmartBack } from '../../hooks/useSmartBack'
import { AFTER_ENQUIRY_HOME_KEY } from '../../services/whatsapp'
import { customerClosedMessage } from '../../utils/subscription'

function draftKey(productId) {
  return productId ? `ck_enquiry_draft_${productId}` : 'ck_enquiry_draft_custom'
}

function loadDraft(productId) {
  try {
    const raw = sessionStorage.getItem(draftKey(productId))
    if (!raw) return createEmptyEnquiryDraft()
    return { ...createEmptyEnquiryDraft(), ...JSON.parse(raw) }
  } catch {
    return createEmptyEnquiryDraft()
  }
}

export function CustomCakePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const productId = params.get('product')
  const { product, loading: productLoading } = useProduct(productId)
  const leave = useSmartBack(productId ? `/products/${productId}` : '/menu')
  const { business } = useBusiness()
  const { access } = useAccess()
  const minimumPreorderDays = business.minimumPreorderDays || 4

  const flow = useMemo(() => getEnquiryFlow(productId ? product : null), [productId, product])
  const steps = flow.steps

  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState(() => loadDraft(productId))
  const [referenceFile, setReferenceFile] = useState(null)
  const [stepError, setStepError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submissionTokenRef = useRef(createSubmissionToken())
  const productPrefillDone = useRef(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(AFTER_ENQUIRY_HOME_KEY) === 'home') {
        sessionStorage.removeItem(AFTER_ENQUIRY_HOME_KEY)
        navigate('/', { replace: true })
        return
      }
    } catch {
      // ignore
    }
    setStepIndex(0)
    setDraft(loadDraft(productId))
    productPrefillDone.current = false
    submissionTokenRef.current = createSubmissionToken()
  }, [productId, navigate])

  useEffect(() => {
    function onPageShow() {
      try {
        if (sessionStorage.getItem(AFTER_ENQUIRY_HOME_KEY) !== 'home') return
        sessionStorage.removeItem(AFTER_ENQUIRY_HOME_KEY)
        navigate('/', { replace: true })
      } catch {
        // ignore
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [navigate])

  const previewUrl = useMemo(() => {
    if (!referenceFile) return null
    return URL.createObjectURL(referenceFile)
  }, [referenceFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(productId), JSON.stringify(draft))
    } catch {
      // ignore
    }
  }, [draft, productId])

  useEffect(() => {
    if (!product || productPrefillDone.current) return
    productPrefillDone.current = true
    setDraft((d) => {
      const next = buildDraftFromProduct(product, d)
      const total = estimateLine(product, next.servings)
      if (total != null) {
        const adv = suggestedAdvance(total)
        next.quotedPrice = total
        next.advanceRequired = adv
        next.balanceAmount = total - adv
        next.autoPriced = true
        next.priceLocked = true
      } else {
        next.quotedPrice = null
        next.advanceRequired = null
        next.balanceAmount = null
        next.autoPriced = false
        next.priceLocked = false
      }
      return next
    })
  }, [product])

  const currentStep = steps[stepIndex]

  function goNext() {
    const error = validateStep(currentStep.id, draft, {
      minimumPreorderDays,
      referenceFile,
      product,
      mode: flow.mode,
    })
    if (error) {
      setStepError(error)
      return
    }
    setStepError('')
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  function goBack() {
    setStepError('')
    setSubmitError('')
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function handleSubmit() {
    const error = validateStep('review', draft, {
      minimumPreorderDays,
      referenceFile,
      product,
      mode: flow.mode,
    })
    if (error) {
      setStepError(error)
      return
    }
    if (submitting) return

    setSubmitting(true)
    setStepError('')
    setSubmitError('')

    try {
      const result = await submitEnquiry({
        draft,
        // Classes never carry a cake reference photo.
        referenceFile,
        submissionToken: submissionTokenRef.current,
        businessId: business.businessId,
        business,
      })
      try {
        sessionStorage.removeItem(draftKey(productId))
      } catch {
        // ignore
      }
      if (result.whatsappUrl) {
        navigate('/', { replace: true })
        return
      }
      setSubmitError('Enquiry saved. We could not open WhatsApp — message us with your enquiry ID.')
    } catch (err) {
      setSubmitError(err?.message || 'Could not send. Try again.')
      submissionTokenRef.current = createSubmissionToken()
    } finally {
      setSubmitting(false)
    }
  }

  if (productId && productLoading) {
    return (
      <section className="page enquiry-page">
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (productId && !productLoading && !isProductOffered(product)) {
    return (
      <section className="page enquiry-page">
        <button type="button" className="back-link" onClick={leave}>
          ← Back
        </button>
        <p className="muted">This item is not on the menu right now.</p>
      </section>
    )
  }

  if (!access.open) {
    return (
      <section className="page enquiry-page">
        <button type="button" className="back-link" onClick={leave}>
          ← Back
        </button>
        <p className="muted">{customerClosedMessage()}</p>
      </section>
    )
  }

  const stepProps = { draft, setDraft }
  const price = customerPrice(product)

  return (
    <section className="page enquiry-page">
      <div className="job-detail-bar">
        {stepIndex > 0 ? (
          <button type="button" className="back-link" onClick={goBack} disabled={submitting}>
            ← Back
          </button>
        ) : (
          <button type="button" className="back-link" onClick={leave}>
            ← Back
          </button>
        )}
        <span className={`shop-price shop-price--${price.kind}`}>{price.short}</span>
      </div>

      {product ? (
        <div className="enquiry-context">
          {product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt="" /> : null}
          <div>
            <strong>{product.name}</strong>
            <p>{price.label}</p>
          </div>
        </div>
      ) : null}

      <EnquiryProgress stepIndex={stepIndex} total={steps.length} labels={steps} />
      <h2 className="enquiry-question">{currentStep.title}</h2>

      {currentStep.id === 'need' && <EnquiryStepNeed {...stepProps} />}
      {currentStep.id === 'occasion' && <EnquiryStepOccasion {...stepProps} />}
      {currentStep.id === 'requirements' && <EnquiryStepRequirements {...stepProps} />}
            {currentStep.id === 'quantity' && <EnquiryStepQuantity {...stepProps} product={product} />}
      {currentStep.id === 'reference' && (
        <EnquiryStepReference
          {...stepProps}
          referenceFile={referenceFile}
          setReferenceFile={setReferenceFile}
          previewUrl={previewUrl}
        />
      )}
      {currentStep.id === 'date' && (
        <EnquiryStepDate {...stepProps} minimumPreorderDays={minimumPreorderDays} />
      )}
            {currentStep.id === 'fulfillment' && <EnquiryStepFulfillment {...stepProps} />}
      {currentStep.id === 'contact' && <EnquiryStepContact {...stepProps} />}
      {currentStep.id === 'gift-details' && <EnquiryStepGiftDetails {...stepProps} />}
      {currentStep.id === 'review' && <EnquiryStepReview draft={draft} previewUrl={previewUrl} />}

      {stepError ? <p className="form-error">{stepError}</p> : null}
      {submitError ? <p className="form-error">{submitError}</p> : null}

      <div className="admin-sticky-actions">
        {stepIndex < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={goNext}>
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Sending…' : 'Continue on WhatsApp'}
          </button>
        )}
      </div>
    </section>
  )
}
