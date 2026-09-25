export function VisifyNote({ tone = 'light' }) {
  return (
    <a
      className={`visify-note${tone === 'dark' ? ' visify-note--on-dark' : ''}`}
      href="mailto:visifyapps@gmail.com"
    >
      <em>Built by small dev for small dreams</em>
      <span>visifyapps@gmail.com</span>
    </a>
  )
}
