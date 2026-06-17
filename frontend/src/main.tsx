import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { validateEnv } from './config/env'
import './index.css'
import App from './App.tsx'

// Validate environment variables on startup
validateEnv();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
