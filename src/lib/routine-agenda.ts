import { db } from './db'

export interface RoutineItem { id: string; mata_pelajaran: string; materi: string; kegiatan: string }
// Kunci = hari Senin(1) sampai Sabtu(6), per kelas. Tersimpan di pengaturan
// sehingga ikut backup dan sync otomatis tanpa tabel baru.
export type RoutineMap = Record<string, RoutineItem[]>

const key = (kelasId: number) => `agenda_rutin_${kelasId}`

export const WEEKDAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function newRoutineId(): string {
  return `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

export async function readRoutineAgenda(kelasId: number): Promise<RoutineMap> {
  try {
    const row = await db.pengaturan.get(key(kelasId))
    if (!row?.value) return {}
    const parsed: unknown = JSON.parse(row.value)
    if (!parsed || typeof parsed !== 'object') return {}
    const clean: RoutineMap = {}
    for (const [day, items] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^[1-6]$/.test(day) || !Array.isArray(items)) continue
      const list = (items as unknown[])
        .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
        .map((i) => ({ id: String(i.id || ''), mata_pelajaran: String(i.mata_pelajaran || ''), materi: String(i.materi || ''), kegiatan: String(i.kegiatan || '') }))
        .filter((i) => i.id && i.mata_pelajaran.trim())
      if (list.length) clean[day] = list
    }
    return clean
  } catch {
    return {}
  }
}

export async function saveRoutineAgenda(kelasId: number, map: RoutineMap): Promise<void> {
  await db.pengaturan.put({ key: key(kelasId), value: JSON.stringify(map), updated_at: new Date().toISOString() })
}
