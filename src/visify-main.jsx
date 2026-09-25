import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VisifyApp } from './VisifyApp'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VisifyApp />
  </StrictMode>,
)
