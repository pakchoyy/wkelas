import { db } from './db'
import type { ElectronAPI } from '../main/preload'

function nowISO() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

const electronAPI: ElectronAPI = {
  db: {
    query: (_sql: string, _params?: any[]) => { throw new Error('raw SQL not supported in web mode') },
    queryOne: (_sql: string, _params?: any[]) => { throw new Error('raw SQL not supported in web mode') },
    exec: (_sql: string, _params?: any[]) => { throw new Error('raw SQL not supported in web mode') },
  },
  siswa: {
    list: async (kelasId: number) => {
      return db.siswa.where({ kelas_id: kelasId }).filter(s => !s.deleted_at).toArray()
    },
    create: async (data: any) => {
      const now = nowISO()
      const id = await db.siswa.add({ ...data, created_at: now, updated_at: now })
      return db.siswa.get(id)
    },
    update: async (id: number, data: any) => {
      await db.siswa.update(id, { ...data, updated_at: nowISO() })
      return db.siswa.get(id)
    },
    delete: async (id: number) => {
      await db.siswa.update(id, { deleted_at: nowISO() })
      return { success: true }
    },
  },
  fieldDef: {
    list: async (kelasId: number) => {
      return db.siswa_field_definitions.where({ kelas_id: kelasId }).toArray()
    },
    create: async (data: any) => {
      return db.siswa_field_definitions.add({ ...data, created_at: nowISO(), updated_at: nowISO(), pilihan: data.pilihan || null })
    },
    update: async (id: number, data: any) => {
      await db.siswa_field_definitions.update(id, { ...data, updated_at: nowISO() })
      return db.siswa_field_definitions.get(id)
    },
    delete: async (id: number) => {
      await db.siswa_field_definitions.delete(id)
      await db.siswa_field_values.where({ field_id: id }).delete()
      return { success: true }
    },
  },
  fieldVal: {
    get: async (siswaId: number) => {
      return db.siswa_field_values.where({ siswa_id: siswaId }).toArray()
    },
    set: async (siswaId: number, fieldId: number, nilai: string | null) => {
      const existing = await db.siswa_field_values.get({ siswa_id: siswaId, field_id: fieldId } as any)
      const now = nowISO()
      if (existing) {
        await db.siswa_field_values.update(existing.id!, { nilai, updated_at: now })
      } else {
        await db.siswa_field_values.add({ siswa_id: siswaId, field_id: fieldId, nilai: nilai || '', updated_at: now })
      }
      return { success: true }
    },
  },
  perilaku: {
    list: async (siswaId?: number) => {
      if (siswaId) return db.perilaku.where({ siswa_id: siswaId }).reverse().sortBy('tanggal')
      return db.perilaku.orderBy('tanggal').reverse().toArray()
    },
    create: async (data: any) => {
      const now = nowISO()
      const id = await db.perilaku.add({ ...data, created_at: now, updated_at: now })
      return db.perilaku.get(id)
    },
    delete: async (id: number) => {
      await db.perilaku.delete(id)
      return { success: true }
    },
  },
  presensi: {
    get: async (kelasId: number, tanggal: string) => {
      return db.presensi.where({ kelas_id: kelasId, tanggal }).toArray()
    },
    listByKelas: async (kelasId: number) => {
      const records = await db.presensi.where({ kelas_id: kelasId }).toArray()
      const siswa = await db.siswa.where({ kelas_id: kelasId }).toArray()
      const map = new Map(siswa.map((s) => [s.id!, s.nama]))
      return records.map((r) => ({ ...r, siswa_nama: map.get(r.siswa_id) || 'Unknown' }))
    },
    save: async (records: any[]) => {
      const now = nowISO()
      for (const r of records) {
        const existing = await db.presensi.get({ siswa_id: r.siswa_id, tanggal: r.tanggal } as any)
        if (existing) {
          await db.presensi.update(existing.id!, { status: r.status, keterangan: r.keterangan || null, updated_at: now })
        } else {
          await db.presensi.add({ ...r, created_at: now, updated_at: now })
        }
      }
      return { success: true }
    },
  },
  mapel: {
    list: async (kelasId: number) => {
      return db.mata_pelajaran.where({ kelas_id: kelasId }).toArray()
    },
    create: async (data: any) => {
      const id = await db.mata_pelajaran.add({ ...data, created_at: nowISO() })
      return db.mata_pelajaran.get(id)
    },
    delete: async (id: number) => {
      await db.mata_pelajaran.delete(id)
      await db.penilaian_kolom.where({ mata_pelajaran_id: id }).delete()
      return { success: true }
    },
  },
  kolom: {
    list: async (mapelId: number) => {
      return db.penilaian_kolom.where({ mata_pelajaran_id: mapelId }).toArray()
    },
    create: async (data: any) => {
      const now = nowISO()
      const id = await db.penilaian_kolom.add({ ...data, created_at: now, updated_at: now })
      return db.penilaian_kolom.get(id)
    },
    update: async (id: number, data: any) => {
      await db.penilaian_kolom.update(id, { ...data, updated_at: nowISO() })
      return db.penilaian_kolom.get(id)
    },
    delete: async (id: number) => {
      await db.penilaian_kolom.delete(id)
      await db.nilai.where({ kolom_id: id }).delete()
      return { success: true }
    },
  },
  nilai: {
    list: async (kolomId: number) => {
      return db.nilai.where({ kolom_id: kolomId }).toArray()
    },
    getAll: async (mapelId: number, siswaIds: number[]) => {
      const koloms = await db.penilaian_kolom.where({ mata_pelajaran_id: mapelId }).toArray()
      const kolomIds = koloms.map(k => k.id!)
      const all = await db.nilai.where('kolom_id').anyOf(kolomIds).toArray()
      const map: Record<string, number | null> = {}
      for (const n of all) {
        map[`${n.siswa_id}-${n.kolom_id}`] = n.nilai ?? null
      }
      return map
    },
    save: async (sId: number, kId: number, val: number | null) => {
      const existing = await db.nilai.get({ siswa_id: sId, kolom_id: kId } as any)
      const now = nowISO()
      if (existing) {
        await db.nilai.update(existing.id!, { nilai: val, updated_at: now })
      } else {
        await db.nilai.add({ siswa_id: sId, kolom_id: kId, nilai: val ?? undefined, created_at: now, updated_at: now })
      }
      return { success: true }
    },
  },
  jadwal: {
    list: async (kelasId: number) => {
      return db.jadwal.where({ kelas_id: kelasId }).toArray()
    },
    save: async (data: any) => {
      if (data.id) {
        await db.jadwal.update(data.id, { ...data, updated_at: nowISO() })
        return db.jadwal.get(data.id)
      }
      const now = nowISO()
      const id = await db.jadwal.add({ ...data, created_at: now, updated_at: now })
      return db.jadwal.get(id)
    },
    delete: async (id: number) => {
      await db.jadwal.delete(id)
      return { success: true }
    },
  },
  rencana: {
    list: async (kelasId: number) => {
      return db.rencana_mengajar.where({ kelas_id: kelasId }).reverse().sortBy('tanggal')
    },
    save: async (data: any) => {
      const now = nowISO()
      if (data.id) {
        await db.rencana_mengajar.update(data.id, { ...data, updated_at: now })
        return db.rencana_mengajar.get(data.id)
      }
      const id = await db.rencana_mengajar.add({ ...data, created_at: now, updated_at: now })
      return db.rencana_mengajar.get(id)
    },
    delete: async (id: number) => {
      await db.rencana_mengajar.delete(id)
      return { success: true }
    },
  },
  kalender: {
    list: async (kelasId: number) => {
      return db.kalender_akademik.where({ kelas_id: kelasId }).toArray()
    },
    save: async (data: any) => {
      const now = nowISO()
      if (data.id) {
        await db.kalender_akademik.update(data.id, { ...data })
        return db.kalender_akademik.get(data.id)
      }
      const id = await db.kalender_akademik.add({ ...data, created_at: now })
      return db.kalender_akademik.get(id)
    },
    delete: async (id: number) => {
      await db.kalender_akademik.delete(id)
      return { success: true }
    },
  },
  jurnal: {
    list: async (kelasId: number) => {
      return db.jurnal_harian.where({ kelas_id: kelasId }).reverse().sortBy('tanggal')
    },
    save: async (data: any) => {
      const now = nowISO()
      if (data.id) {
        await db.jurnal_harian.update(data.id, { ...data, updated_at: now })
        return db.jurnal_harian.get(data.id)
      }
      const id = await db.jurnal_harian.add({ ...data, created_at: now, updated_at: now })
      return db.jurnal_harian.get(id)
    },
    delete: async (id: number) => {
      await db.jurnal_harian.delete(id)
      return { success: true }
    },
  },
  catatan: {
    list: async () => {
      return db.catatan_guru.filter(c => !c.deleted_at).reverse().sortBy('created_at')
    },
    save: async (data: any) => {
      const now = nowISO()
      if (data.id) {
        await db.catatan_guru.update(data.id, { ...data, updated_at: now })
        return db.catatan_guru.get(data.id)
      }
      const id = await db.catatan_guru.add({ ...data, created_at: now, updated_at: now, is_pinned: data.is_pinned || 0, warna: data.warna || '#ffffff' })
      return db.catatan_guru.get(id)
    },
    delete: async (id: number) => {
      await db.catatan_guru.update(id, { deleted_at: nowISO() })
      return { success: true }
    },
  },
  todo: {
    list: async () => {
      return db.todo.filter(t => !t.deleted_at).toArray()
    },
    save: async (data: any) => {
      const now = nowISO()
      if (data.id) {
        await db.todo.update(data.id, { ...data, updated_at: now })
        return db.todo.get(data.id)
      }
      const id = await db.todo.add({ ...data, created_at: now, updated_at: now, prioritas: data.prioritas || 'normal' })
      return db.todo.get(id)
    },
    toggle: async (id: number) => {
      const item = await db.todo.get(id)
      if (!item) return null
      const now = nowISO()
      if (item.status === 'selesai') {
        await db.todo.update(id, { status: 'belum', completed_at: null, updated_at: now })
      } else {
        await db.todo.update(id, { status: 'selesai', completed_at: now, updated_at: now })
      }
      return db.todo.get(id)
    },
    delete: async (id: number) => {
      await db.todo.update(id, { deleted_at: nowISO() })
      return { success: true }
    },
  },
  dokumenSaya: {
    list: async () => {
      return db.dokumen_saya.filter(d => !d.deleted_at).reverse().sortBy('created_at')
    },
    create: async (data: any) => {
      const now = nowISO()
      const id = await db.dokumen_saya.add({ ...data, created_at: now, updated_at: now })
      return db.dokumen_saya.get(id)
    },
    upload: async (data: any) => {
      return new Promise<any>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.jpg,.png,.jpeg,.gif,.zip,.rar'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) { resolve(null); return }
          const buffer = await file.arrayBuffer()
          const now = nowISO()
          const id = await db.dokumen_saya.add({
            judul: data.judul,
            deskripsi: data.deskripsi || null,
            kategori: data.kategori || null,
            file_data: new Uint8Array(buffer),
            format_file: file.name.split('.').pop()?.toLowerCase() || '',
            ukuran_file: file.size,
            created_at: now,
            updated_at: now,
          })
          resolve(db.dokumen_saya.get(id))
        }
        input.click()
      })
    },
    delete: async (id: number) => {
      await db.dokumen_saya.update(id, { deleted_at: nowISO() })
      return { success: true }
    },
  },
  dialog: {
    openFile: async (_filters?: any[]) => {
      return new Promise<any>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) { resolve(null); return }
          resolve({ filePath: file.name, fileName: file.name, format: file.name.split('.').pop() || '', size: file.size })
        }
        input.click()
      })
    },
  },
  backup: {
    create: async () => {
      const tables = ['guru', 'kelas', 'siswa', 'siswa_field_definitions', 'siswa_field_values', 'presensi', 'mata_pelajaran', 'penilaian_kolom', 'nilai', 'perilaku', 'jadwal', 'kalender_akademik', 'rencana_mengajar', 'jurnal_harian', 'catatan_guru', 'todo', 'dokumen_saya', 'perangkat_ajar_cache', 'pengaturan'] as const
      const backup: Record<string, any[]> = {}
      for (const t of tables) {
        backup[t] = await (db as any)[t].toArray()
      }
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bgy-backup-${new Date().toISOString().split('T')[0]}.bgy`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true, path: a.download }
    },
    restore: async () => {
      return new Promise<any>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.bgy,.json'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) { resolve({ success: false }); return }
          try {
            const text = await file.text()
            const backup = JSON.parse(text)
            await (db as any).transaction('rw', db.tables, async () => {
              for (const table of db.tables) {
                await (table as any).clear()
              }
              for (const [name, records] of Object.entries(backup)) {
                if ((db as any)[name]) {
                  for (const r of records as any[]) {
                    await (db as any)[name].add(r)
                  }
                }
              }
            })
            resolve({ success: true })
          } catch (e) {
            resolve({ success: false, error: 'File backup tidak valid' })
          }
        }
        input.click()
      })
    },
  },
  platform: 'web',
}

export default electronAPI
