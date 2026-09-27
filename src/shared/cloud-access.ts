import type { AccountPlan } from './subscription'

export const OWNER_EMAIL = 'choiruddin2410@gmail.com'

// Uji coba Pro sebelum paket dijual: hanya akun pemilik.
const PRO_TRIAL_EMAILS = new Set([OWNER_EMAIL])

export function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase()
}

export function isOwnerEmail(email?: string | null) {
  return normalizeEmail(email) === OWNER_EMAIL
}

export function planForEmail(email?: string | null): AccountPlan {
  return PRO_TRIAL_EMAILS.has(normalizeEmail(email)) ? 'pro' : 'free'
}
