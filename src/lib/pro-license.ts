import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '../renderer/stores/authStore'

export const PRO_ACCESS = 'wali_kelas'
// Kunci unik per tool (semua tool BGY satu pola, jangan saling menimpa).
const CACHE_KEY = 'bgy_pro_wk'
export const LYNK_URL = ''
export const ADMIN_WA = 'https://wa.me/6289530713597'

export type ProStatus = { is_pro: boolean; plan_type: string | null; active_until: string | null }
const PENDING_KEY = 'bgy-pending-activation'

const friendly = (message?: string) => message?.replace(/^.*?ERROR:\s*/, '') || 'Aktivasi belum berhasil. Periksa koneksi lalu coba lagi.'

export function readCachedPlan(uid: string | null) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (!cached || cached.uid !== uid) return null
    if (cached.active_until && Date.parse(cached.active_until) < Date.now()) return null
    return cached as { uid: string; plan: 'pro' | 'free'; active_until: string | null }
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
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ uid, plan, active_until: row?.active_until ?? null })) } catch {}
}

export async function activatePro(client: SupabaseClient, email: string, code: string): Promise<ProStatus> {
  const { data, error } = await client.rpc('bgy_activate_pro', { p_email: email.trim(), p_code: code.trim(), p_access: PRO_ACCESS })
  if (error) throw new Error(friendly(error.message))
  const row = (Array.isArray(data) ? data[0] : data) as ProStatus
  if (!row?.is_pro) throw new Error('Kode diterima, tetapi masa Pro tidak aktif. Hubungi admin.')
  return row
}

export async function subscriptionStatus(client: SupabaseClient, email: string): Promise<ProStatus | null> {
  const { data, error } = await client.rpc('bgy_subscription_status', { p_email: email.trim(), p_access: PRO_ACCESS })
  if (error) throw new Error(friendly(error.message))
  return ((Array.isArray(data) ? data[0] : data) as ProStatus) || null
}

export async function requestActivationCode(client: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await client.rpc('bgy_request_activation_code', { p_email: email.trim(), p_access: PRO_ACCESS })
  if (error) throw new Error(friendly(error.message))
  return String(data)
}

// Link dari halaman aktivasi bisa dibuka sebelum login; simpan dulu agar tidak hilang.
export function capturePendingActivation() {
  const hash = window.location.hash
  if (!hash.startsWith('#/aktivasi?')) return
  try { sessionStorage.setItem(PENDING_KEY, hash.slice('#/aktivasi?'.length)) } catch {}
}
export function takePendingActivation(): { email: string; kode: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const params = new URLSearchParams(raw)
    return { email: params.get('email') || '', kode: params.get('kode') || '' }
  } catch { return null }
}
export function hasPendingActivation() {
  try { return !!sessionStorage.getItem(PENDING_KEY) } catch { return false }
}
export function clearPendingActivation() {
  try { sessionStorage.removeItem(PENDING_KEY) } catch {}
}
