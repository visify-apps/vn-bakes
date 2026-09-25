import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSmartBack } from '../../hooks/useSmartBack'
import { getAdminProduct, listAdminProducts, saveProduct } from '../../services/firestore/adminProducts'
import { seedCategories } from '../../data/seedCatalogue'
import { compressImageFile } from '../../utils/imageCompress'

const PRICE_CHOICES = [
  { id: 'starting_from', label: 'From' },
  { id: 'fixed', label: 'Fixed' },
  { id: 'enquiry', label: 'Ask' },
]

const emptyForm = {
  id: '',
  name: '',
  categoryId: 'fresh-cream',
  description: '',
  basePrice: '',
  priceType: 'starting_from',
  minimumQuantity: '',
  available: true,
  requiresCustomEnquiry: false,
  displayOrder: 99,
  customFields: [],
  imageUrls: [],
}

function toForm(product) {
  return {
    id: product.id,
    name: product.name || '',
    categoryId: product.categoryId || 'fresh-cream',
    description: product.description || '',
    basePrice: product.basePrice ?? '',
    priceType: product.priceType || 'enquiry',
    minimumQuantity: product.minimumQuantity ?? '',
    available: product.available !== false,
    requiresCustomEnquiry: Boolean(product.requiresCustomEnquiry),
    displayOrder: product.displayOrder ?? 0,
    customFields: product.customFields || [],
    imageUrls: product.imageUrls || [],
  }
}

function looksLikeImageUrl(value) {
  const raw = String(value || '').trim()
  if (!/^https?:\/\//i.test(raw)) return false
  if (/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(raw)) return true
  return /unsplash\.com|cloudinary\.com|firebasestorage|imgur\.com|googleusercontent/i.test(raw)
}

export function AdminProductEditPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const goBack = useSmartBack('/admin/products')
  const isNew = !productId
  const [form, setForm] = useState(emptyForm)
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) {
      let cancelled = false
      listAdminProducts().then((items) => {
        if (cancelled) return
        const max = items.reduce((n, p) => Math.max(n, Number(p.displayOrder) || 0), 0)
        setForm((f) => ({ ...f, displayOrder: max + 1 }))
      })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    setLoading(true)
    getAdminProduct(productId)
      .then((product) => {
        if (cancelled) return
        if (!product) {
          setMissing(true)
          return
        }
        setForm(toForm(product))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isNew, productId])

  async function handleImagePick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const dataUrl = await compressImageFile(file)
      setForm((f) => ({
        ...f,
        imageUrls: [dataUrl, ...(f.imageUrls || []).slice(0, 2)],
      }))
    } catch (err) {
      setError(err?.message || 'Could not process image.')
    } finally {
      setUploading(false)
    }
  }

  function addImageUrl() {
    const url = imageUrlDraft.trim()
    if (!url) return
    if (!looksLikeImageUrl(url)) {
      setError('Paste a full http(s) image URL (jpg, png, webp, or Unsplash/CDN link).')
      return
    }
    if ((form.imageUrls || []).length >= 3) {
      setError('Maximum 3 photos.')
      return
    }
    setError('')
    setForm((f) => ({
      ...f,
      imageUrls: [url, ...(f.imageUrls || []).slice(0, 2)],
    }))
    setImageUrlDraft('')
  }

  function removeImage(index) {
    setForm((f) => ({
      ...f,
      imageUrls: (f.imageUrls || []).filter((_, i) => i !== index),
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveProduct({
        ...form,
        basePrice: form.priceType === 'enquiry' ? '' : form.basePrice,
      })
      navigate('/admin/products')
    } catch (err) {
      setError(err?.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="page admin-page menu-edit">
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (missing) {
    return (
      <section className="page admin-page menu-edit">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
        <p className="muted">Item not found.</p>
      </section>
    )
  }

  const ask = form.priceType === 'enquiry'

  return (
    <section className="page admin-page menu-edit">
      <div className="job-detail-bar">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
        <button
          type="button"
          className={`status-badge ${form.available ? 'status-new' : 'status-cancelled'}`}
          onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
        >
          {form.available ? 'On menu' : 'Hidden'}
        </button>
      </div>

      <form className="menu-edit__form" onSubmit={handleSave}>
        <div className="menu-photos">
          {(form.imageUrls || []).map((url, index) => (
            <div key={index} className="menu-photo">
              <img src={url} alt="" />
              <button type="button" onClick={() => removeImage(index)} aria-label="Remove photo">
                ×
              </button>
            </div>
          ))}
          {(form.imageUrls || []).length < 3 ? (
            <label className="menu-photo menu-photo--add">
              <span>{uploading ? '…' : '+'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={uploading}
                onChange={handleImagePick}
              />
            </label>
          ) : null}
        </div>

        {(form.imageUrls || []).length < 3 ? (
          <label className="enquiry-field">
            Or paste image URL
            <div className="menu-price-row">
              <input
                type="url"
                inputMode="url"
                placeholder="https://… (Unsplash, Drive link, CDN)"
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={addImageUrl}>
                Add
              </button>
            </div>
            <span className="enquiry-hint">
              Use a real network photo URL for the menu — customers see this on Cakes / Classes.
            </span>
          </label>
        ) : null}

        <label className="enquiry-field">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>

        <label className="enquiry-field">
          Category
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            {seedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="enquiry-field">
          Price
          <div className="menu-price-types">
            {PRICE_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`quick-filter${form.priceType === choice.id ? ' is-active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, priceType: choice.id }))}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>

        {!ask ? (
          <div className="menu-price-row">
            <label className="enquiry-field">
              ₹
              <input
                inputMode="decimal"
                value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
              />
            </label>
            <label className="enquiry-field">
              Min
              <input
                inputMode="numeric"
                value={form.minimumQuantity}
                onChange={(e) => setForm((f) => ({ ...f, minimumQuantity: e.target.value }))}
              />
            </label>
          </div>
        ) : null}

        <label className="enquiry-field">
          Note
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={form.requiresCustomEnquiry}
            onChange={(e) => setForm((f) => ({ ...f, requiresCustomEnquiry: e.target.checked }))}
          />
          Custom order
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="admin-sticky-actions">
          <button className="btn btn-primary" type="submit" disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </section>
  )
}
