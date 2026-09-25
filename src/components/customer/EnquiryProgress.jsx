export function EnquiryProgress({ stepIndex, total, labels }) {
  const current = labels[stepIndex]
  return (
    <div className="enquiry-progress" aria-live="polite">
      <div className="enquiry-progress__meta">
        <span>
          {stepIndex + 1} / {total}
        </span>
        <span>{current?.short || current?.title}</span>
      </div>
      <div className="enquiry-progress__bar" aria-hidden="true">
        <span style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
      </div>
    </div>
  )
}
