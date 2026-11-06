import type { SupabaseClient } from '@supabase/supabase-js'
import { db, localChangeCount } from './db'
import { createBackupText, restoreBackupText, type BackupTables } from './backup'
import { backupFingerprint } from './backup-history'

// Satu baris per user di public.user_data (migrasi 202609290001 + 202611040001).
// Payload = JSON cadangan TANPA isi file Dokumen Saya: dokumen pribadi tidak pernah diunggah.
const TABLE = 'user_data'

export type SyncState = { enabled: boolean; lastFingerprint: string; lastSyncAt: string; remoteAt: string; lastError: string; optedOut?: boolean }
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

// Kirim bersyarat lewat RPC push_user_data. Server menolak bila cloud sudah berubah
// sejak terakhir dikenal perangkat ini. force=true: pengguna sengaja menimpa cloud.
export async function pushSnapshot(client: SupabaseClient, uid: string, options: { force?: boolean } = {}): Promise<SyncState> {
  const text = await cloudText()
  const fingerprint = await backupFingerprint(text)
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error('Data lokal rusak sehingga tidak bisa dikirim. Buat cadangan file dulu.') }
  const previous = readSyncState(uid)
  const expected = options.force ? await remoteSnapshotAt(client, uid) : previous.remoteAt || null
  let remoteAt: string
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
  const state = { enabled: true, lastFingerprint: fingerprint, lastSyncAt: new Date().toISOString(), remoteAt, lastError: '', optedOut: false }
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
  writeSyncState(uid, { enabled: true, lastFingerprint: await localFingerprint(), lastSyncAt: new Date().toISOString(), remoteAt: String(row.updated_at), lastError: '' })
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
    if (meta) return (await pullSnapshot(client, uid, () => true)) ? 'unchanged' : 'disabled'
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
        const ok = await pullSnapshot(client, uid, () => true)
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
        const ok = await pullSnapshot(client, uid, () => true)
        return ok ? 'unchanged' : 'remote-newer'
      } catch {
        return 'remote-newer'
      }
    }
    if (decision !== 'remote-newer') return decision
    if (await localFingerprint() !== state.lastFingerprint) return decision
    const ok = await pullSnapshot(client, uid, () => true)
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
