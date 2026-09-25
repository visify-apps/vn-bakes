import { useState } from 'react'
import { useBusiness } from '../../context/BusinessContext'
import { useSmartBack } from '../../hooks/useSmartBack'

export function AdminSettingsPage() {
  const goBack = useSmartBack('/admin/more')
  const { business, loading, saveBusiness } = useBusiness()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const values = form || {
    displayName: business.displayName || '',
    whatsappNumber: business.whatsappNumber || business.phone || '',
    minimumPreorderDays: business.minimumPreorderDays ?? 4,
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!values.displayName.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveBusiness({
        displayName: values.displayName.trim(),
        whatsappNumber: values.whatsappNumber.trim(),
        minimumPreorderDays: Number(values.minimumPreorderDays) || 4,
      })
      setForm(null)
    } catch (err) {
      setError(err?.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page admin-page menu-edit">
      <div className="job-detail-bar">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
      </div>

      <header className="menu-head">
        <div>
          <h1>Settings</h1>
        </div>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}

      <form className="menu-edit__form" onSubmit={handleSave}>
        <label className="enquiry-field">
          Bakery
          <input
            value={values.displayName}
            onChange={(e) => setForm({ ...values, displayName: e.target.value })}
            required
          />
        </label>
        <label className="enquiry-field">
          WhatsApp
          <input
            inputMode="tel"
            value={values.whatsappNumber}
            onChange={(e) => setForm({ ...values, whatsappNumber: e.target.value })}
          />
        </label>
        <label className="enquiry-field">
          Preorder days
          <input
            inputMode="numeric"
            value={values.minimumPreorderDays}
            onChange={(e) => setForm({ ...values, minimumPreorderDays: e.target.value })}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="admin-sticky-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </section>
  )
}
