export function OptionGrid({ options, value, onChange, name }) {
  return (
    <div className="option-grid" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const optValue = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        const selected = value === optValue
        return (
          <button
            key={String(optValue) + label}
            type="button"
            className={`option-chip${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onChange(optValue)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
