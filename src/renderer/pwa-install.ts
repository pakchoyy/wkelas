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

// Versi 2: penanda lama ikut terpasang saat guru hanya membuat shortcut, jadi diabaikan.
export const INSTALLED_FLAG = 'bgy-pwa-installed-v2'
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}
export function isInstalledFlag(): boolean {
  try { return localStorage.getItem(INSTALLED_FLAG) === '1' } catch { return false }
}
export function markInstalledFlag(): void {
  try { localStorage.setItem(INSTALLED_FLAG, '1') } catch {}
}

export function manualInstructions(platform: ReturnType<typeof installPlatform>): string {
  if (platform === 'android') return 'Ketuk menu ⋮ di Chrome, lalu pilih "Instal aplikasi". Jangan pilih "Tambahkan ke layar utama" karena itu hanya membuat shortcut.'
  if (platform === 'ios') return 'Di Safari, ketuk tombol Bagikan lalu pilih "Tambahkan ke Layar Utama".'
  return 'Klik ikon instal di ujung kanan kolom alamat Chrome/Edge, lalu pilih Instal.'
}
