import { useLocation, useNavigate } from 'react-router-dom'

function safePath(value) {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}

/**
 * Go to the previous screen the user actually came from.
 * Uses browser history when this visit was in-app; otherwise state.from or fallback
 * (cold open / pasted link).
 */
export function useSmartBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()

  return function goBack() {
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    const from = safePath(location.state?.from)
    if (from && from !== location.pathname) {
      navigate(from)
      return
    }
    navigate(fallback)
  }
}
