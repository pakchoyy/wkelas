import type { BgyDatabase } from './db'
import { validateDateRange } from './calendar-storage'

type Field = 'materi' | 'kegiatan' | 'kendala' | 'refleksi'
type Target = {id?:number;kelas_id:number;tanggal:string;jam_ke:string;mata_pelajaran:string}
// Read and patch inside one transaction, including the first edit of a schedule slot.
export async function saveJournalField(db: BgyDatabase, target: Target, field: Field, value: string) {
  validateDateRange(target.tanggal)
  if (!['materi','kegiatan','kendala','refleksi'].includes(field)) throw new Error('Kolom jurnal tidak valid.')
  return db.transaction('rw', db.jurnal_harian, async () => {
    const matches = target.id ? [] : await db.jurnal_harian.where({kelas_id:target.kelas_id,tanggal:target.tanggal}).filter(r => String(r.jam_ke) === String(target.jam_ke)).toArray()
    if (matches.length > 1) throw new Error('Ada beberapa jurnal pada jam ini. Edit melalui laporan bulanan.')
    const existing = target.id ? await db.jurnal_harian.get(target.id) : matches[0]
    if (target.id && (!existing || existing.kelas_id !== target.kelas_id)) throw new Error('Jurnal tidak ditemukan. Muat ulang halaman.')
    const now = new Date().toISOString()
    if (existing) {
      await db.jurnal_harian.update(existing.id,{[field]:value,updated_at:now})
      return db.jurnal_harian.get(existing.id)
    }
    const id = await db.jurnal_harian.add({...target,materi:'',kegiatan:'',kendala:'',refleksi:'',[field]:value,created_at:now,updated_at:now})
    return db.jurnal_harian.get(id)
  })
}

export async function createJournalDraft(db: BgyDatabase, data: any) {
  validateDateRange(data.tanggal)
  return db.transaction('rw',db.jurnal_harian,async () => {
    const existing = await db.jurnal_harian.where({kelas_id:data.kelas_id,tanggal:data.tanggal}).filter(item => String(item.jam_ke) === String(data.jam_ke)).first()
    if (existing) throw new Error('Jurnal untuk tanggal dan jam ini sudah ada. Buka menu Jurnal untuk mengeditnya.')
    const now = new Date().toISOString()
    return db.jurnal_harian.add({...data,created_at:now,updated_at:now})
  })
}
