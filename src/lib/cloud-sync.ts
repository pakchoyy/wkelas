import type { SupabaseClient } from '@supabase/supabase-js'
import { db, localChangeCount } from './db'
import { BACKUP_TABLES, createBackupText, restoreBackupText, type BackupTables } from './backup'
import { backupFingerprint } from './backup-history'

// Satu baris per user di public.user_data (migrasi 202609290001 + 202611040001).
// Payload = JSON cadangan TANPA isi file Dokumen Saya: dokumen pribadi tidak pernah diunggah.
const TABLE = 'user_data'

export type SyncState = { enabled: boolean; lastFingerprint: string; lastSyncAt: string; remoteAt: string; lastError: string; optedOut?: boolean; tableFps?: Record<string, string> }
export type AutoDecision = 'disabled' | 'remote-newer' | 'unchanged' | 'push'

const stateKey = (uid: string) => `bgy-cloud-sync-${uid}`
const empty: SyncState = { enabled: false, lastFingerprint: '', lastSyncAt: '', remoteAt: '', lastError: '' }

export function readSyncState(uid: string): SyncState {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(stateKey(uid)) || '{}') } } catch { return empty }
}
function writeSyncState(uid: string, state: SyncState) {
  try { localStorage.setItem(stateKey(uid), JSON.stringify(state)) } catch {}
  window.dispatchEvent(new Event('bgy-sync-state'))
}

// Waktu dari server bisa berbeda format (mikrodetik/zona) antara select dan RPC.
export function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return !a && !b
  return a === b || Date.parse(a) === Date.parse(b)
}

// Perangkat hanya boleh menimpa cloud bila salinan cloud masih yang terakhir ia kenal.
export function decideAutoSync(state: SyncState, localFingerprint: string, remoteAt: string | null): AutoDecision {
  if (!state.enabled) return 'disabled'
  if (remoteAt && !sameInstant(remoteAt, state.remoteAt)) return 'remote-newer'
  if (localFingerprint === state.lastFingerprint) return 'unchanged'
  return 'push'
}

export class SyncConflictError extends Error {
  constructor() { super('Cloud berisi data lebih baru dari perangkat lain. Ambil dulu dari cloud, atau kirim ulang untuk menimpanya.') }
}

const errorText = (error: unknown) => `${(error as { code?: string } | null)?.code || ''} ${(error as { message?: string } | null)?.message || ''}`

function tableError(error: unknown, fallback: string): Error {
  const msg = errorText(error)
  if (/user_data/i.test(msg) && (/42P01|does not exist|not exist|not find/i.test(msg))) {
    return new Error('Tabel user_data belum ada di project. Jalankan migrasi 202609290001_user_data.sql di Supabase SQL Editor.')
  }
  if (/terlalu besar/i.test(msg)) return new Error('Data terlalu besar untuk sinkron (maksimal 20 MB). Hapus data lama yang tidak dipakai lalu coba lagi.')
  if (/khusus Pro/i.test(msg)) return new Error('Masa Pro sudah habis. Data cloud tetap bisa diambil, tetapi pengiriman baru butuh Pro aktif.')
  return new Error(fallback)
}

export interface CloudMeta { updated_at: string; fingerprint: string }

export async function cloudMeta(client: SupabaseClient, uid: string): Promise<CloudMeta | null> {
  const { data, error } = await client.from(TABLE).select('updated_at,fingerprint').eq('user_id', uid).maybeSingle()
  if (error) throw tableError(error, 'Status cloud belum bisa dibaca. Periksa koneksi lalu coba lagi.')
  const row = data as { updated_at?: string; fingerprint?: string } | null
  if (!row?.updated_at) return null
  return { updated_at: String(row.updated_at), fingerprint: String(row.fingerprint || '') }
}

export async function remoteSnapshotAt(client: SupabaseClient, uid: string): Promise<string | null> {
  const meta = await cloudMeta(client, uid)
  return meta ? meta.updated_at : null
}

const cloudText = () => createBackupText(db, { withFiles: false })

export async function localFingerprint(): Promise<string> {
  return backupFingerprint(await cloudText())
}

// JSON dengan urutan kunci baku: jsonb di server mengurutkan ulang kunci objek.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value as object).sort().map(k => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
const sha256 = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('')

// Satu kali rakit: data lengkap, sidik jari total (rumus lama, tetap kompatibel) dan per tabel.
export async function localSnapshot(): Promise<{ text: string; tables: BackupTables; fingerprint: string; tableFps: Record<string, string> }> {
  const text = await cloudText()
  const tables = JSON.parse(text).tables as BackupTables
  const tableFps: Record<string, string> = {}
  for (const name of BACKUP_TABLES) tableFps[name] = await sha256(canonicalJson(tables[name] || []))
  return { text, tables, fingerprint: await backupFingerprint(text), tableFps }
}

// Tabel yang isinya berbeda dari yang terakhir diketahui ada di cloud.
export function changedTables(local: Record<string, string>, known: Record<string, string> | undefined): string[] {
  if (!known || !Object.keys(known).length) return [...BACKUP_TABLES]
  return BACKUP_TABLES.filter(name => local[name] !== known[name])
}

// Kirim bersyarat lewat RPC push_user_data. Server menolak bila cloud sudah berubah
// sejak terakhir dikenal perangkat ini. force=true: pengguna sengaja menimpa cloud.
export async function pushSnapshot(client: SupabaseClient, uid: string, options: { force?: boolean } = {}): Promise<SyncState> {
  const snap = await localSnapshot()
  const { text, fingerprint, tableFps } = snap
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error('Data lokal rusak sehingga tidak bisa dikirim. Buat cadangan file dulu.') }
  const previous = readSyncState(uid)
  const expected = options.force ? await remoteSnapshotAt(client, uid) : previous.remoteAt || null
  let remoteAt: string
  // Hemat: kirim hanya tabel yang berubah sejak terakhir sama dengan cloud.
  const changed = changedTables(tableFps, options.force || !expected ? undefined : previous.tableFps)
  const parts: Record<string, unknown> = {}
  for (const name of changed) parts[name] = snap.tables[name as keyof BackupTables]
  const partsRpc = await client.rpc('push_user_data_parts', { p_parts: parts, p_table_fps: tableFps, p_fingerprint: fingerprint, p_expected: expected })
  if (!partsRpc.error) {
    const state = { enabled: true, lastFingerprint: fingerprint, lastSyncAt: new Date().toISOString(), remoteAt: String(partsRpc.data || ''), lastError: '', optedOut: false, tableFps }
    writeSyncState(uid, state)
    return state
  }
  if (/SYNC_CONFLICT/.test(errorText(partsRpc.error))) throw new SyncConflictError()
  if (!/PGRST202|push_user_data_parts/i.test(errorText(partsRpc.error))) throw tableError(partsRpc.error, 'Data belum terkirim ke cloud. Periksa koneksi lalu coba lagi.')
  // Migrasi per tabel belum dijalankan: kirim penuh seperti sebelumnya.
  const rpc = await client.rpc('push_user_data', { p_data: payload, p_fingerprint: fingerprint, p_expected: expected })
  if (rpc.error) {
    const msg = errorText(rpc.error)
    if (/SYNC_CONFLICT/.test(msg)) throw new SyncConflictError()
    if (!/PGRST202|push_user_data/i.test(msg)) throw tableError(rpc.error, 'Data belum terkirim ke cloud. Periksa koneksi lalu coba lagi.')
    // Migrasi 202611040001 belum dijalankan: pakai cara lama agar sinkron tetap jalan.
    const { error } = await client.from(TABLE).upsert(
      { user_id: uid, data: payload, fingerprint, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    if (error) throw tableError(error, 'Data belum terkirim ke cloud. Periksa koneksi lalu coba lagi.')
    remoteAt = await remoteSnapshotAt(client, uid) || ''
  } else {
    remoteAt = String(rpc.data || '')
  }
  const state = { enabled: true, lastFingerprint: fingerprint, lastSyncAt: new Date().toISOString(), remoteAt, lastError: '', optedOut: false, tableFps }
  writeSyncState(uid, state)
  return state
}

export async function pullSnapshot(client: SupabaseClient, uid: string, confirm: (tables: BackupTables) => boolean | Promise<boolean>): Promise<boolean> {
  const { data, error } = await client.from(TABLE).select('data,updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw tableError(error, 'Data cloud gagal diunduh. Periksa koneksi lalu coba lagi.')
  const row = data as { data?: unknown; updated_at?: string } | null
  if (!row?.updated_at) throw new Error('Belum ada data di cloud untuk akun ini.')
  if (!row.data) throw new Error('Data cloud gagal diunduh. Periksa koneksi lalu coba lagi.')
  const restored = await restoreBackupText(db, JSON.stringify(row.data), confirm, { keepLocalFiles: true })
  if (!restored) return false
  const after = await localSnapshot()
  writeSyncState(uid, { enabled: true, lastFingerprint: after.fingerprint, lastSyncAt: new Date().toISOString(), remoteAt: String(row.updated_at), lastError: '', optedOut: false, tableFps: after.tableFps })
  return true
}

const FILE_TABLES = new Set(['dokumen_saya', 'perangkat_ajar_cache'])

// Ambil otomatis yang hemat: unduh hanya tabel yang berbeda dari perangkat ini.
// Cloud lama tanpa sidik jari per tabel = ambil penuh seperti biasa.
export async function pullChanges(client: SupabaseClient, uid: string): Promise<boolean> {
  const { data, error } = await client.from(TABLE).select('updated_at,table_fps').eq('user_id', uid).maybeSingle()
  if (error) {
    if (/table_fps/i.test(errorText(error))) return pullSnapshot(client, uid, () => true)
    throw tableError(error, 'Data cloud gagal diunduh. Periksa koneksi lalu coba lagi.')
  }
  const row = data as { updated_at?: string; table_fps?: Record<string, string> } | null
  if (!row?.updated_at) throw new Error('Belum ada data di cloud untuk akun ini.')
  const remoteFps = row.table_fps || {}
  if (!BACKUP_TABLES.every(name => typeof remoteFps[name] === 'string')) return pullSnapshot(client, uid, () => true)
  const local = await localSnapshot()
  const changed = BACKUP_TABLES.filter(name => remoteFps[name] !== local.tableFps[name])
  if (changed.length) {
    const select = changed.map(name => `${name}:data->tables->${name}`).join(',')
    const res = await client.from(TABLE).select(select).eq('user_id', uid).maybeSingle()
    if (res.error || !res.data) throw tableError(res.error, 'Data cloud gagal diunduh. Periksa koneksi lalu coba lagi.')
    const got = res.data as unknown as Record<string, unknown>
    for (const name of changed) if (!Array.isArray(got[name])) return pullSnapshot(client, uid, () => true)
    await db.transaction('rw', changed.map(name => db.table(name)), async () => {
      for (const name of changed) {
        let rows = got[name] as Record<string, any>[]
        if (FILE_TABLES.has(name)) {
          const files = new Map<unknown, Uint8Array>()
          for (const r of await db.table(name).toArray()) if (r.file_data) files.set(r.id, r.file_data)
          rows = rows.map(r => r.file_data == null && files.has(r.id) ? { ...r, file_data: files.get(r.id) } : r)
        }
        await db.table(name).clear()
        await db.table(name).bulkAdd(rows)
      }
    })
  }
  const after = changed.length ? await localSnapshot() : local
  writeSyncState(uid, { ...readSyncState(uid), enabled: true, lastFingerprint: after.fingerprint, lastSyncAt: new Date().toISOString(), remoteAt: String(row.updated_at), lastError: '', optedOut: false, tableFps: remoteFps })
  return true
}

// Salinan data perangkat sebelum diganti data cloud (tanpa isi file), untuk jaga-jaga.
export const SAFETY_KEY = (uid: string) => `bgy-presync-copy-${uid}`
async function keepSafetyCopy(uid: string) {
  try {
    const text = await cloudText()
    if (text.length < 3_000_000) localStorage.setItem(SAFETY_KEY(uid), JSON.stringify({ at: new Date().toISOString(), text }))
  } catch { /* penyimpanan penuh: lanjut tanpa salinan */ }
}

export function disableSync(uid: string) {
  writeSyncState(uid, { ...readSyncState(uid), enabled: false, optedOut: true })
}

// Catat kegagalan agar terlihat di menu profil (bukan ditelan diam-diam).
export function markSyncError(uid: string, error: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const text = error instanceof Error ? error.message : 'Sinkron gagal. Coba lagi.'
  const state = readSyncState(uid)
  if (state.lastError !== text) writeSyncState(uid, { ...state, lastError: text })
}
function clearSyncError(uid: string) {
  const state = readSyncState(uid)
  if (state.lastError) writeSyncState(uid, { ...state, lastError: '' })
}

// Sinkron saat aplikasi dibuka/diforeground: dorong dulu seperti biasa;
// bila cloud lebih baru DAN tidak ada editan lokal tertunda, tarik diam-diam
// (tanpa reload — daftar liveQuery ikut terbarui sendiri).
// Bila ada editan lokal, jangan timpa: kembalikan 'remote-newer' agar banner bicara.
export async function bootSync(client: SupabaseClient, uid: string): Promise<AutoDecision> {
  // Perangkat kosong (baru, atau data browser terhapus) + cloud berisi: ambil dulu.
  // Tidak ada yang hilang karena di perangkat memang belum ada kelas.
  if (!(typeof navigator !== 'undefined' && navigator.onLine === false) && (await db.kelas.count()) === 0) {
    const meta = await cloudMeta(client, uid).catch(() => null)
    if (meta) return (await pullChanges(client, uid)) ? 'unchanged' : 'disabled'
  }
  const decision = await autoSync(client, uid, true)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return decision
  try {
    const state = readSyncState(uid)
    // Adopsi perangkat baru: sync belum pernah aktif + cloud ada isi.
    // - Lokal masih kosong → ambil otomatis agar refresh/buka langsung sinkron.
    // - Lokal sudah ada isi → jangan tebak (takut menimpa): bila sidik jari beda,
    //   kembalikan 'remote-newer' agar banner meminta putusan manual.
    if (!state.enabled && !state.lastSyncAt) {
      if (decision !== 'disabled') return decision
      let meta: CloudMeta | null
      try { meta = await cloudMeta(client, uid) } catch { return decision }
      // Cloud masih kosong + perangkat berisi kelas: aktifkan sinkron otomatis (akun Pro)
      // agar perangkat lain bisa langsung mengambil. Akun gratis ditolak server; abaikan.
      if (!meta) {
        if (!state.optedOut && (await db.kelas.count()) > 0) {
          try { await pushSnapshot(client, uid); return 'unchanged' } catch { return decision }
        }
        return decision
      }
      if ((await db.kelas.count()) === 0) {
        const ok = await pullChanges(client, uid)
        return ok ? 'unchanged' : decision
      }
      // Pro = cloud sumber utama: perangkat yang baru bergabung langsung memakai data cloud.
      // Salinan data lama perangkat ini disimpan dulu agar masih bisa dipulihkan.
      try {
        const fingerprint = await localFingerprint()
        if (fingerprint && meta.fingerprint && fingerprint === meta.fingerprint) {
          writeSyncState(uid, { ...readSyncState(uid), enabled: true, lastFingerprint: fingerprint, lastSyncAt: new Date().toISOString(), remoteAt: meta.updated_at, lastError: '' })
          return 'unchanged'
        }
        await keepSafetyCopy(uid)
        const ok = await pullChanges(client, uid)
        return ok ? 'unchanged' : 'remote-newer'
      } catch {
        return 'remote-newer'
      }
    }
    if (decision !== 'remote-newer') return decision
    if (await localFingerprint() !== state.lastFingerprint) return decision
    const ok = await pullChanges(client, uid)
    return ok ? 'unchanged' : decision
  } catch {
    return decision
  }
}

// Tanpa perubahan lokal tidak ada query cloud dan data tidak dirakit ulang,
// kecuali sudah lama tidak cek (agar banner "data lebih baru" muncul maksimal 15 menit kemudian).
const IDLE_CHECK_INTERVAL = 2 * 60 * 1000
let lastIdleCheck = 0
let lastSeenChange = -1

export async function autoSync(client: SupabaseClient, uid: string, force = false): Promise<AutoDecision> {
  // Hemat kuota: offline = tidak ada query sama sekali, bahkan tidak merakit backup lokal.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'disabled'
  const state = readSyncState(uid)
  if (!state.enabled) return 'disabled'
  const changes = localChangeCount()
  const idle = Date.now() - lastIdleCheck < IDLE_CHECK_INTERVAL
  if (!force && changes === lastSeenChange && idle) return 'unchanged'
  const fingerprint = await localFingerprint()
  lastSeenChange = changes
  if (fingerprint === state.lastFingerprint && idle && !force) return 'unchanged'
  lastIdleCheck = Date.now()
  const decision = decideAutoSync(state, fingerprint, await remoteSnapshotAt(client, uid))
  if (decision === 'push') {
    // Jangan pernah menimpa cloud dengan perangkat yang kosong.
    if ((await db.kelas.count()) === 0) return 'remote-newer'
    try { await pushSnapshot(client, uid) } catch (error) {
      if (error instanceof SyncConflictError) return 'remote-newer'
      throw error
    }
  } else clearSyncError(uid)
  return decision
}
