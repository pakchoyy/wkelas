import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '../renderer/stores/authStore'

export const PRO_ACCESS = 'wali_kelas'
// Kunci unik per tool (semua tool BGY satu pola, jangan saling menimpa).
const CACHE_KEY = 'bgy_pro_wk'
// Link produk Pro di toko Kreacy. Diisi lewat env hosting (VITE_PRO_BUY_URL).
const envBuy = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_PRO_BUY_URL
export const PRO_BUY_URL = envBuy && /^https:\/\//.test(envBuy) ? envBuy : 'https://kreacy.my.id/produk/1bumlai7'
export const PRO_PRICE = 'Rp23.000 / semester'
// Salinan status Pro hanya dipercaya maksimal 7 hari saat offline.
const CACHE_MAX_AGE = 7 * 86400000
export const ADMIN_WA = 'https://wa.me/6289530713597'

export type ProStatus = { is_pro: boolean; plan_type: string | null; active_until: string | null }
const PENDING_KEY = 'bgy-pending-activation'

// Pesan dari server sudah berbahasa Indonesia; pesan teknis diganti kalimat yang ramah.
const friendly = (message?: string) => {
  const text = message?.replace(/^.*?ERROR:\s*/, '').trim() || ''
  if (!text || /permission denied|does not exist|could not find|PGRST|schema cache|JWT|fetch/i.test(text)) return 'Aktivasi belum berhasil. Periksa koneksi lalu coba lagi, atau hubungi admin.'
  return text
}

export function readCachedPlan(uid: string | null) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (!cached || cached.uid !== uid) return null
    if (cached.active_until && Date.parse(cached.active_until) < Date.now()) return null
    if (!cached.checked_at || Date.now() - Date.parse(cached.checked_at) > CACHE_MAX_AGE) return null
    return cached as { uid: string; plan: 'pro' | 'free'; active_until: string | null; checked_at: string }
  } catch { return null }
}

// Status Pro selalu dari server; salinan lokal hanya dipakai saat offline.
export async function refreshPlan(client: SupabaseClient, uid: string) {
  const { data, error } = await client.rpc('my_plan')
  if (error) {
    const cached = readCachedPlan(uid)
    if (cached) useAuthStore.getState().setPlan(cached.plan, cached.active_until)
    return
  }
  const row = (Array.isArray(data) ? data[0] : data) as { plan: 'pro' | 'free'; active_until: string | null } | undefined
  const plan = row?.plan === 'pro' ? 'pro' : 'free'
  useAuthStore.getState().setPlan(plan, row?.active_until ?? null)
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ uid, plan, active_until: row?.active_until ?? null, checked_at: new Date().toISOString() })) } catch {}
}

export async function activatePro(client: SupabaseClient, email: string, code: string): Promise<ProStatus> {
  const { data, error } = await client.rpc('bgy_activate_pro', { p_email: email.trim(), p_code: code.trim(), p_access: PRO_ACCESS })
  if (error) throw new Error(friendly(error.message))
  const row = (Array.isArray(data) ? data[0] : data) as ProStatus
  if (!row?.is_pro) throw new Error('Kode diterima, tetapi masa Pro tidak aktif. Hubungi admin.')
  return row
}

// Link klaim dari halaman pesanan Kreacy: Pro langsung menempel ke akun yang sedang masuk.
export async function claimPro(client: SupabaseClient, token: string): Promise<ProStatus> {
  const { data, error } = await client.rpc('bgy_claim_pro', { p_token: token.trim() })
  if (error) throw new Error(friendly(error.message))
  const row = (Array.isArray(data) ? data[0] : data) as ProStatus
  if (!row?.is_pro) throw new Error('Klaim diterima, tetapi masa Pro tidak aktif. Hubungi admin.')
  return row
}

export async function subscriptionStatus(client: SupabaseClient, email: string): Promise<ProStatus | null> {
  const { data, error } = await client.rpc('bgy_subscription_status', { p_email: email.trim(), p_access: PRO_ACCESS })
  if (error) throw new Error(friendly(error.message))
  return ((Array.isArray(data) ? data[0] : data) as ProStatus) || null
}


// Link dari halaman aktivasi bisa dibuka sebelum login; simpan dulu agar tidak hilang.
export function capturePendingActivation() {
  const hash = window.location.hash
  if (!hash.startsWith('#/aktivasi?')) return
  try { sessionStorage.setItem(PENDING_KEY, hash.slice('#/aktivasi?'.length)) } catch {}
}
export function takePendingActivation(): { email: string; kode: string; klaim: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const params = new URLSearchParams(raw)
    return { email: params.get('email') || '', kode: params.get('kode') || '', klaim: params.get('klaim') || '' }
  } catch { return null }
}
export function hasPendingActivation() {
  try { return !!sessionStorage.getItem(PENDING_KEY) } catch { return false }
}
export function clearPendingActivation() {
  try { sessionStorage.removeItem(PENDING_KEY) } catch {}
}
