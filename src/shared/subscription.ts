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
