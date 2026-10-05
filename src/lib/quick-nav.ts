import { db } from './db'
import { resolveQuickNav } from '../renderer/components/quick-nav-options'

const KEY = 'navigasi_cepat'

// Preferensi menu bawah HP. Global per aplikasi (bukan per kelas) agar konsisten,
// dan ikut backup/sync otomatis karena tersimpan di pengaturan.
export async function readQuickNav(): Promise<string[]> {
  try {
    const row = await db.pengaturan.get(KEY)
    if (!row?.value) return resolveQuickNav(null)
    return resolveQuickNav(JSON.parse(row.value))
  } catch {
    return resolveQuickNav(null)
  }
}

export async function saveQuickNav(paths: string[]): Promise<string[]> {
  const resolved = resolveQuickNav(paths)
  await db.pengaturan.put({ key: KEY, value: JSON.stringify(resolved), updated_at: new Date().toISOString() })
  return resolved
}
