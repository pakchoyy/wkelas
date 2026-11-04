export type AccountPlan = 'free' | 'pro'

// Satu-satunya daftar fitur Pro. Status plan selalu berasal dari server (my_plan).
// Fitur lain tetap gratis: pekerjaan harian dan cadangan file manual tidak pernah dikunci.
export type ProFeature = 'sinkron_cloud' | 'multi_kelas'

export const PRO_FEATURES: Record<ProFeature, string> = {
  sinkron_cloud: 'Sinkron otomatis HP dan laptop + cadangan cloud',
  multi_kelas: 'Kelola banyak kelas dan naik kelas ke tahun ajaran baru',
}

export function canUse(_feature: ProFeature, plan: AccountPlan | null | undefined, mode?: string | null): boolean {
  return plan === 'pro' && (mode === undefined || mode === 'login')
}

// Hari tersisa sebelum Pro habis (null = tanpa batas / bukan Pro).
export function proDaysLeft(proUntil: string | null | undefined, now = Date.now()): number | null {
  if (!proUntil) return null
  const end = Date.parse(proUntil)
  if (!Number.isFinite(end)) return null
  return Math.ceil((end - now) / 86400000)
}

// Pengingat perpanjangan muncul 14 hari dan 3 hari sebelum habis.
export function renewalReminder(daysLeft: number | null): 'h14' | 'h3' | null {
  if (daysLeft === null || daysLeft < 0) return null
  if (daysLeft <= 3) return 'h3'
  if (daysLeft <= 14) return 'h14'
  return null
}

// ---------- Harga & promo ----------
export const PRO_PRICE_RUPIAH = 23000
const NORMAL_DAYS = 182 // 6 bulan
// Promo November 2026: beli sebelum 1 Desember, Pro aktif sampai akhir Juni 2027 (WIB).
export const PROMO = {
  name: 'Promo November',
  startsAt: '2026-11-01T00:00:00+07:00',
  endsAt: '2026-12-01T00:00:00+07:00',
  proUntil: '2027-06-30T23:59:59+07:00',
} as const

export function activePromo(now = Date.now()) {
  return now >= Date.parse(PROMO.startsAt) && now < Date.parse(PROMO.endsAt) ? PROMO : null
}

export const rupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`
const ceilTo = (value: number, step: number) => Math.ceil(value / step) * step

// Harga dihitung per hari dan per bulan dari masa aktif yang benar-benar didapat.
export function priceBreakdown(now = Date.now()) {
  const promo = activePromo(now)
  const days = promo ? Math.max(1, Math.ceil((Date.parse(promo.proUntil) - now) / 86400000)) : NORMAL_DAYS
  const months = days / 30.44
  return {
    promo,
    days,
    months: Math.floor(months),
    perDay: ceilTo(PRO_PRICE_RUPIAH / days, 10),
    perMonth: ceilTo(PRO_PRICE_RUPIAH / months, 100),
  }
}
