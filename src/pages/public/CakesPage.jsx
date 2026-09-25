import { Navigate } from 'react-router-dom'

/** Legacy /cakes URL → cake menu only (classes stay on /classes). */
export function CakesPage() {
  return <Navigate to="/menu" replace />
}
