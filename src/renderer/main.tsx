import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './globals.css'
import webAPI from '../lib/web-api'

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
