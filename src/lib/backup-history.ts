export const BACKUP_HISTORY_KEY = 'bgy-backup-history-v1'
export const BACKUP_REMINDER_DAYS = 30
export type BackupHistory = { startedAt: string; filename: string; fingerprint: string }

export function readBackupHistory(raw: string | null): BackupHistory | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return typeof value.startedAt === 'string' && Number.isFinite(Date.parse(value.startedAt))
      && typeof value.filename === 'string' && /^[a-f0-9]{64}$/.test(value.fingerprint) ? value : null
  } catch { return null }
}

// Only hash the tables; each export has a new creation timestamp.
export async function backupFingerprint(text: string): Promise<string> {
  const { tables } = JSON.parse(text)
  const bytes = new TextEncoder().encode(JSON.stringify(tables))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('')
}

export function backupReminder(history: BackupHistory | null, fingerprint: string, now = Date.now()) {
  if (!history) return 'Belum ada riwayat unduhan cadangan pada browser ini. Buat cadangan sebelum menghapus data situs atau pindah perangkat.'
  if (history.fingerprint !== fingerprint) return 'Ada perubahan data sejak unduhan cadangan terakhir. Buat cadangan baru agar perubahan ikut tersalin.'
  if (now - Date.parse(history.startedAt) >= BACKUP_REMINDER_DAYS * 86400000) return 'Cadangan terakhir sudah lebih dari 30 hari. Buat cadangan baru dan simpan salinannya di tempat yang aman.'
  return 'Data saat ini sama dengan salinan terakhir yang disiapkan. Tetap pastikan file .bgy sudah tersimpan.'
}

export function backupIsDue(history: BackupHistory | null, now = Date.now()) {
  return !history || now - Date.parse(history.startedAt) >= BACKUP_REMINDER_DAYS * 86400000
}
