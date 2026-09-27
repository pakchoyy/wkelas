import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './globals.css'
import './theme-dark.css'
import { initTheme } from './theme'
import { initInstallCapture } from './pwa-install'
import { capturePendingActivation } from '../lib/pro-license'
import webAPI from '../lib/web-api'

initTheme()
initInstallCapture()
capturePendingActivation()

if (!window.electronAPI) {
  window.electronAPI = webAPI as any
}

// Daftarkan service worker untuk PWA (hanya di web http/https, bukan Electron/file).
if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
