export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'bgy-theme'

export function readTheme(): ThemePref {
  try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : 'system' } catch { return 'system' }
}

function resolved(pref: ThemePref) {
  return pref === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref
}

export function applyTheme(pref = readTheme()) {
  const theme = resolved(pref)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#0d7a8a')
}

export function setTheme(pref: ThemePref) {
  try { pref === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, pref) } catch {}
  applyTheme(pref)
}

export function initTheme() {
  applyTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (readTheme() === 'system') applyTheme() })
  // Cetakan selalu terang agar hemat tinta dan terbaca.
  window.addEventListener('beforeprint', () => { document.documentElement.dataset.theme = 'light' })
  window.addEventListener('afterprint', () => applyTheme())
}
