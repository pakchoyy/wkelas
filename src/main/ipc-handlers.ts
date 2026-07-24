import { ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { db } from './db/database'
import { nowISO } from '../shared/utils'

export function registerIpcHandlers() {
  ipcMain.handle('db:query', (_event, sql: string, params?: any[]) => {
    return db.query(sql, params)
  })

  ipcMain.handle('db:queryOne', (_event, sql: string, params?: any[]) => {
    return db.queryOne(sql, params)
  })

  ipcMain.handle('db:exec', (_event, sql: string, params?: any[]) => {
    return db.exec(sql, params)
  })

  ipcMain.handle('siswa:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM siswa WHERE kelas_id = ? AND deleted_at IS NULL ORDER BY no_absen', [kelasId])
  })

  ipcMain.handle('siswa:create', (_event, data: any) => {
    const now = nowISO()
    db.exec(
      'INSERT INTO siswa (kelas_id, nama, nis, jenis_kelamin, no_absen, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.kelas_id, data.nama, data.nis || null, data.jenis_kelamin || null, data.no_absen || null, now, now]
    )
    return db.queryOne('SELECT * FROM siswa ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('siswa:update', (_event, id: number, data: any) => {
    const now = nowISO()
    db.exec(
      'UPDATE siswa SET nama=?, nis=?, jenis_kelamin=?, no_absen=?, updated_at=? WHERE id=?',
      [data.nama, data.nis || null, data.jenis_kelamin || null, data.no_absen || null, now, id]
    )
    return db.queryOne('SELECT * FROM siswa WHERE id = ?', [id])
  })

  ipcMain.handle('siswa:delete', (_event, id: number) => {
    const now = nowISO()
    db.exec('UPDATE siswa SET deleted_at=? WHERE id=?', [now, id])
    return { success: true }
  })

  ipcMain.handle('fieldDef:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM siswa_field_definitions WHERE kelas_id = ? ORDER BY urutan', [kelasId])
  })

  ipcMain.handle('fieldDef:create', (_event, data: any) => {
    const now = nowISO()
    db.exec(
      'INSERT INTO siswa_field_definitions (kelas_id, nama_field, slug, tipe, pilihan, wajib, urutan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.kelas_id, data.nama_field, data.slug, data.tipe, data.pilihan || null, data.wajib || 0, data.urutan || 0, now, now]
    )
    return db.queryOne('SELECT * FROM siswa_field_definitions ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('fieldDef:update', (_event, id: number, data: any) => {
    const now = nowISO()
    db.exec(
      'UPDATE siswa_field_definitions SET nama_field=?, tipe=?, pilihan=?, wajib=?, urutan=?, updated_at=? WHERE id=?',
      [data.nama_field, data.tipe, data.pilihan || null, data.wajib || 0, data.urutan || 0, now, id]
    )
    return db.queryOne('SELECT * FROM siswa_field_definitions WHERE id = ?', [id])
  })

  ipcMain.handle('fieldDef:delete', (_event, id: number) => {
    db.exec('DELETE FROM siswa_field_values WHERE field_id = ?', [id])
    db.exec('DELETE FROM siswa_field_definitions WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('fieldVal:get', (_event, siswaId: number) => {
    return db.query('SELECT * FROM siswa_field_values WHERE siswa_id = ?', [siswaId])
  })

  ipcMain.handle('fieldVal:set', (_event, siswaId: number, fieldId: number, nilai: string | null) => {
    const now = nowISO()
    const existing = db.queryOne('SELECT id FROM siswa_field_values WHERE siswa_id = ? AND field_id = ?', [siswaId, fieldId])
    if (existing) {
      db.exec('UPDATE siswa_field_values SET nilai=?, updated_at=? WHERE id=?', [nilai, now, existing.id])
    } else {
      db.exec('INSERT INTO siswa_field_values (siswa_id, field_id, nilai, updated_at) VALUES (?, ?, ?, ?)', [siswaId, fieldId, nilai, now])
    }
    return { success: true }
  })

  ipcMain.handle('perilaku:list', (_event, siswaId?: number) => {
    if (siswaId) {
      return db.query('SELECT * FROM perilaku WHERE siswa_id = ? ORDER BY tanggal DESC', [siswaId])
    }
    return db.query('SELECT * FROM perilaku ORDER BY tanggal DESC')
  })

  ipcMain.handle('perilaku:create', (_event, data: any) => {
    const now = nowISO()
    db.exec(
      'INSERT INTO perilaku (siswa_id, tanggal, jenis, kategori, deskripsi, tindak_lanjut, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.siswa_id, data.tanggal, data.jenis, data.kategori || null, data.deskripsi, data.tindak_lanjut || null, now, now]
    )
    return db.queryOne('SELECT * FROM perilaku ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('perilaku:delete', (_event, id: number) => {
    db.exec('DELETE FROM perilaku WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('presensi:get', (_event, kelasId: number, tanggal: string) => {
    return db.query('SELECT * FROM presensi WHERE kelas_id = ? AND tanggal = ?', [kelasId, tanggal])
  })

  ipcMain.handle('presensi:save', (_event, records: { siswa_id: number; kelas_id: number; tanggal: string; status: string; keterangan?: string }[]) => {
    const now = nowISO()
    for (const r of records) {
      const existing = db.queryOne('SELECT id FROM presensi WHERE siswa_id = ? AND tanggal = ?', [r.siswa_id, r.tanggal])
      if (existing) {
        if (r.status === 'H') {
          db.exec('DELETE FROM presensi WHERE id = ?', [existing.id])
        } else {
          db.exec('UPDATE presensi SET status=?, keterangan=?, updated_at=? WHERE id=?', [r.status, r.keterangan || null, now, existing.id])
        }
      } else if (r.status !== 'H') {
        db.exec('INSERT INTO presensi (siswa_id, kelas_id, tanggal, status, keterangan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [r.siswa_id, r.kelas_id, r.tanggal, r.status, r.keterangan || null, now, now])
      }
    }
    return { success: true }
  })

  ipcMain.handle('mapel:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM mata_pelajaran WHERE kelas_id = ? ORDER BY urutan', [kelasId])
  })

  ipcMain.handle('mapel:create', (_event, data: any) => {
    const now = nowISO()
    db.exec('INSERT INTO mata_pelajaran (kelas_id, nama, kode, urutan, created_at) VALUES (?, ?, ?, ?, ?)',
      [data.kelas_id, data.nama, data.kode || null, data.urutan || 0, now])
    return db.queryOne('SELECT * FROM mata_pelajaran ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('mapel:delete', (_event, id: number) => {
    db.exec('DELETE FROM penilaian_kolom WHERE mata_pelajaran_id = ?', [id])
    db.exec('DELETE FROM mata_pelajaran WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('kolom:list', (_event, mapelId: number) => {
    return db.query('SELECT * FROM penilaian_kolom WHERE mata_pelajaran_id = ? ORDER BY urutan', [mapelId])
  })

  ipcMain.handle('kolom:create', (_event, data: any) => {
    const now = nowISO()
    db.exec('INSERT INTO penilaian_kolom (mata_pelajaran_id, label, bobot, tanggal, urutan, catatan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.mata_pelajaran_id, data.label, data.bobot || 1.0, data.tanggal || null, data.urutan || 0, data.catatan || null, now, now])
    return db.queryOne('SELECT * FROM penilaian_kolom ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('kolom:update', (_event, id: number, data: any) => {
    const now = nowISO()
    db.exec('UPDATE penilaian_kolom SET label=?, bobot=?, tanggal=?, urutan=?, catatan=?, updated_at=? WHERE id=?',
      [data.label, data.bobot, data.tanggal || null, data.urutan || 0, data.catatan || null, now, id])
    return db.queryOne('SELECT * FROM penilaian_kolom WHERE id = ?', [id])
  })

  ipcMain.handle('kolom:delete', (_event, id: number) => {
    db.exec('DELETE FROM nilai WHERE kolom_id = ?', [id])
    db.exec('DELETE FROM penilaian_kolom WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('nilai:list', (_event, kolomId: number) => {
    return db.query('SELECT * FROM nilai WHERE kolom_id = ?', [kolomId])
  })

  ipcMain.handle('nilai:getAll', (_event, mapelId: number, siswaIds: number[]) => {
    const placeholders = siswaIds.map(() => '?').join(',')
    return db.query(
      `SELECT n.* FROM nilai n JOIN penilaian_kolom pk ON n.kolom_id = pk.id WHERE pk.mata_pelajaran_id = ? AND n.siswa_id IN (${placeholders})`,
      [mapelId, ...siswaIds]
    )
  })

  ipcMain.handle('nilai:save', (_event, siswaId: number, kolomId: number, nilai: number | null) => {
    const now = nowISO()
    const existing = db.queryOne('SELECT id FROM nilai WHERE siswa_id = ? AND kolom_id = ?', [siswaId, kolomId])
    if (existing) {
      if (nilai === null) {
        db.exec('DELETE FROM nilai WHERE id = ?', [existing.id])
      } else {
        db.exec('UPDATE nilai SET nilai=?, updated_at=? WHERE id=?', [nilai, now, existing.id])
      }
    } else if (nilai !== null) {
      db.exec('INSERT INTO nilai (siswa_id, kolom_id, nilai, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [siswaId, kolomId, nilai, now, now])
    }
    return { success: true }
  })

  ipcMain.handle('jadwal:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM jadwal WHERE kelas_id = ? ORDER BY hari, jam_ke', [kelasId])
  })

  ipcMain.handle('jadwal:save', (_event, data: any) => {
    const now = nowISO()
    if (data.id) {
      db.exec('UPDATE jadwal SET hari=?, jam_ke=?, jam_mulai=?, jam_selesai=?, mata_pelajaran_id=?, nama_mapel_custom=?, nama_guru=?, ruang=?, updated_at=? WHERE id=?',
        [data.hari, data.jam_ke, data.jam_mulai, data.jam_selesai, data.mata_pelajaran_id || null, data.nama_mapel_custom || null, data.nama_guru || null, data.ruang || null, now, data.id])
      return db.queryOne('SELECT * FROM jadwal WHERE id = ?', [data.id])
    }
    db.exec('INSERT INTO jadwal (kelas_id, hari, jam_ke, jam_mulai, jam_selesai, mata_pelajaran_id, nama_mapel_custom, nama_guru, ruang, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.kelas_id, data.hari, data.jam_ke, data.jam_mulai, data.jam_selesai, data.mata_pelajaran_id || null, data.nama_mapel_custom || null, data.nama_guru || null, data.ruang || null, now, now])
    return db.queryOne('SELECT * FROM jadwal ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('jadwal:delete', (_event, id: number) => {
    db.exec('DELETE FROM jadwal WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('rencana:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM rencana_mengajar WHERE kelas_id = ? ORDER BY tanggal DESC', [kelasId])
  })

  ipcMain.handle('rencana:save', (_event, data: any) => {
    const now = nowISO()
    if (data.id) {
      db.exec('UPDATE rencana_mengajar SET tanggal=?, mata_pelajaran_id=?, topik=?, tujuan_pembelajaran=?, kegiatan=?, media=?, penilaian=?, catatan=?, status=?, updated_at=? WHERE id=?',
        [data.tanggal, data.mata_pelajaran_id || null, data.topik, data.tujuan_pembelajaran || null, data.kegiatan || null, data.media || null, data.penilaian || null, data.catatan || null, data.status || 'draft', now, data.id])
      return db.queryOne('SELECT * FROM rencana_mengajar WHERE id = ?', [data.id])
    }
    db.exec('INSERT INTO rencana_mengajar (kelas_id, tanggal, mata_pelajaran_id, topik, tujuan_pembelajaran, kegiatan, media, penilaian, catatan, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.kelas_id, data.tanggal, data.mata_pelajaran_id || null, data.topik, data.tujuan_pembelajaran || null, data.kegiatan || null, data.media || null, data.penilaian || null, data.catatan || null, data.status || 'draft', now, now])
    return db.queryOne('SELECT * FROM rencana_mengajar ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('rencana:delete', (_event, id: number) => {
    db.exec('DELETE FROM rencana_mengajar WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('kalender:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM kalender_akademik WHERE kelas_id IS NULL OR kelas_id = ? ORDER BY tanggal_mulai', [kelasId])
  })

  ipcMain.handle('kalender:save', (_event, data: any) => {
    const now = nowISO()
    db.exec('INSERT INTO kalender_akademik (kelas_id, tanggal_mulai, tanggal_selesai, judul, jenis, deskripsi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.kelas_id || null, data.tanggal_mulai, data.tanggal_selesai || null, data.judul, data.jenis, data.deskripsi || null, now])
    return db.queryOne('SELECT * FROM kalender_akademik ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('kalender:delete', (_event, id: number) => {
    db.exec('DELETE FROM kalender_akademik WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('jurnal:list', (_event, kelasId: number) => {
    return db.query('SELECT * FROM jurnal_harian WHERE kelas_id = ? ORDER BY tanggal DESC', [kelasId])
  })

  ipcMain.handle('jurnal:save', (_event, data: any) => {
    const now = nowISO()
    if (data.id) {
      db.exec('UPDATE jurnal_harian SET tanggal=?, jam_ke=?, mata_pelajaran=?, materi=?, kegiatan=?, kendala=?, refleksi=?, updated_at=? WHERE id=?',
        [data.tanggal, data.jam_ke || null, data.mata_pelajaran || null, data.materi || null, data.kegiatan || null, data.kendala || null, data.refleksi || null, now, data.id])
      return db.queryOne('SELECT * FROM jurnal_harian WHERE id = ?', [data.id])
    }
    db.exec('INSERT INTO jurnal_harian (kelas_id, tanggal, jam_ke, mata_pelajaran, materi, kegiatan, kendala, refleksi, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.kelas_id, data.tanggal, data.jam_ke || null, data.mata_pelajaran || null, data.materi || null, data.kegiatan || null, data.kendala || null, data.refleksi || null, now, now])
    return db.queryOne('SELECT * FROM jurnal_harian ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('jurnal:delete', (_event, id: number) => {
    db.exec('DELETE FROM jurnal_harian WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('catatan:list', () => {
    return db.query('SELECT * FROM catatan_guru WHERE deleted_at IS NULL ORDER BY is_pinned DESC, created_at DESC')
  })

  ipcMain.handle('catatan:save', (_event, data: any) => {
    const now = nowISO()
    if (data.id) {
      db.exec('UPDATE catatan_guru SET judul=?, isi=?, tag=?, warna=?, is_pinned=?, updated_at=? WHERE id=?',
        [data.judul, data.isi || null, data.tag || null, data.warna || '#ffffff', data.is_pinned || 0, now, data.id])
      return db.queryOne('SELECT * FROM catatan_guru WHERE id = ?', [data.id])
    }
    db.exec('INSERT INTO catatan_guru (judul, isi, tag, warna, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.judul, data.isi || null, data.tag || null, data.warna || '#ffffff', data.is_pinned || 0, now, now])
    return db.queryOne('SELECT * FROM catatan_guru ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('catatan:delete', (_event, id: number) => {
    const now = nowISO()
    db.exec('UPDATE catatan_guru SET deleted_at=? WHERE id=?', [now, id])
    return { success: true }
  })

  ipcMain.handle('todo:list', () => {
    return db.query('SELECT * FROM todo WHERE deleted_at IS NULL ORDER BY status, deadline ASC')
  })

  ipcMain.handle('todo:save', (_event, data: any) => {
    const now = nowISO()
    if (data.id) {
      db.exec('UPDATE todo SET judul=?, deskripsi=?, prioritas=?, status=?, deadline=?, completed_at=?, updated_at=? WHERE id=?',
        [data.judul, data.deskripsi || null, data.prioritas || 'normal', data.status || 'belum', data.deadline || null, data.status === 'selesai' ? now : null, now, data.id])
      return db.queryOne('SELECT * FROM todo WHERE id = ?', [data.id])
    }
    db.exec('INSERT INTO todo (judul, deskripsi, prioritas, status, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.judul, data.deskripsi || null, data.prioritas || 'normal', data.status || 'belum', data.deadline || null, now, now])
    return db.queryOne('SELECT * FROM todo ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('todo:toggle', (_event, id: number) => {
    const now = nowISO()
    const t = db.queryOne('SELECT * FROM todo WHERE id = ?', [id])
    if (!t) return { success: false }
    const newStatus = t.status === 'selesai' ? 'belum' : 'selesai'
    db.exec('UPDATE todo SET status=?, completed_at=?, updated_at=? WHERE id=?', [newStatus, newStatus === 'selesai' ? now : null, now, id])
    return db.queryOne('SELECT * FROM todo WHERE id = ?', [id])
  })

  ipcMain.handle('todo:delete', (_event, id: number) => {
    const now = nowISO()
    db.exec('UPDATE todo SET deleted_at=? WHERE id=?', [now, id])
    return { success: true }
  })

  ipcMain.handle('dokumenSaya:list', () => {
    return db.query('SELECT * FROM dokumen_saya WHERE deleted_at IS NULL ORDER BY created_at DESC')
  })

  ipcMain.handle('dokumenSaya:create', (_event, data: any) => {
    const now = nowISO()
    db.exec('INSERT INTO dokumen_saya (judul, deskripsi, kategori, file_path, format_file, ukuran_file, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.judul, data.deskripsi || null, data.kategori || null, data.file_path, data.format_file || null, data.ukuran_file || null, now, now])
    return db.queryOne('SELECT * FROM dokumen_saya ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('dokumenSaya:delete', (_event, id: number) => {
    const now = nowISO()
    db.exec('UPDATE dokumen_saya SET deleted_at=? WHERE id=?', [now, id])
    return { success: true }
  })

  ipcMain.handle('dialog:openFile', async (_event, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || [{ name: 'Semua File', extensions: ['*'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const stats = fs.statSync(filePath)
    return {
      filePath,
      fileName: path.basename(filePath),
      format: path.extname(filePath).slice(1).toLowerCase(),
      size: stats.size,
    }
  })

  ipcMain.handle('dokumenSaya:upload', async (_event, data: { judul: string; deskripsi?: string; kategori?: string }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Dokumen', extensions: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'txt', 'jpg', 'png'] },
        { name: 'Semua File', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const sourcePath = result.filePaths[0]
    const fileName = path.basename(sourcePath)
    const ext = path.extname(sourcePath).slice(1).toLowerCase()
    const stats = fs.statSync(sourcePath)

    const appFolder = path.join(process.env.APPDATA || process.cwd(), 'bgy-wali-kelas', 'dokumen-saya')
    if (!fs.existsSync(appFolder)) fs.mkdirSync(appFolder, { recursive: true })

    const destPath = path.join(appFolder, `${Date.now()}_${fileName}`)
    fs.copyFileSync(sourcePath, destPath)

    const now = nowISO()
    db.exec(
      'INSERT INTO dokumen_saya (judul, deskripsi, kategori, file_path, format_file, ukuran_file, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.judul, data.deskripsi || null, data.kategori || null, destPath, ext, stats.size, now, now]
    )
    return db.queryOne('SELECT * FROM dokumen_saya ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('backup:create', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `bgy-backup-${new Date().toISOString().split('T')[0]}.bgy`,
      filters: [{ name: 'Backup BGY', extensions: ['bgy'] }],
    })
    if (result.canceled || !result.filePath) return { success: false }

    const dbData = db.getDb().export()
    const key = crypto.scryptSync('bgy-wali-kelas-secret-key-2026', 'salt-bgy', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(Buffer.from(dbData)), cipher.final()])
    const authTag = cipher.getAuthTag()

    const header = Buffer.from('BGY1')
    const payload = Buffer.concat([header, iv, authTag, encrypted])
    fs.writeFileSync(result.filePath, payload)

    return { success: true, path: result.filePath }
  })

  ipcMain.handle('backup:restore', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Backup BGY', extensions: ['bgy'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return { success: false }

    const filePath = result.filePaths[0]
    const payload = fs.readFileSync(filePath)

    const header = payload.slice(0, 4).toString()
    if (header !== 'BGY1') return { success: false, error: 'File backup tidak valid' }

    const iv = payload.slice(4, 20)
    const authTag = payload.slice(20, 36)
    const encrypted = payload.slice(36)

    const key = crypto.scryptSync('bgy-wali-kelas-secret-key-2026', 'salt-bgy', 32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    db.close()
    await db.replaceWith(new Uint8Array(decrypted))
    return { success: true }
  })
}
