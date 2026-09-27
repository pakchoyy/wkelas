// beforeinstallprompt hanya dikirim sekali saat halaman dimuat, jadi ditangkap sejak awal,
// sebelum login/onboarding selesai dan komponen pemasangan tampil.
export type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(fn => fn())

export function initInstallCapture() {
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferred = event as InstallPromptEvent; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; try { localStorage.setItem('bgy-pwa-installed-v2', '1') } catch {} notify() })
}
export const installPrompt = () => deferred
export function clearInstallPrompt() { deferred = null; notify() }
export function onInstallChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

export function installPlatform(): 'android' | 'ios' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return /Android/i.test(ua) ? 'android' : 'desktop'
}
