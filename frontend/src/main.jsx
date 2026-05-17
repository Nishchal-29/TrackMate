import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from "@azure/msal-react"
import { msalInstance } from './lib/msalConfig'
import './index.css'
import App from './App.jsx'

// Initialize MSAL before rendering the React tree
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  )
})