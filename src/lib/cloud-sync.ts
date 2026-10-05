import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from './db'
import { createBackupText, restoreBackupText, type BackupTables } from './backup'
import { backupFingerprint } from './backup-history'

// Satu baris per user di public.user_data (migrasi 202609290001).
// Payload = JSON yang sama dengan file cadangan, jadi restore/pulihkan dipakai ulang.
const TABLE = 'user_data'

export type SyncState = { enabled: boolean; lastFingerprint: string; lastSyncAt: string; remoteAt: string }
export type AutoDecision = 'disabled' | 'remote-newer' | 'unchanged' | 'push'

const stateKey = (uid: string) => `bgy-cloud-sync-${uid}`
const empty: SyncState = { enabled: false, lastFingerprint: '', lastSyncAt: '', remoteAt: '' }

export function readSyncState(uid: string): SyncState {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(stateKey(uid)) || '{}') } } catch { return empty }
}
function writeSyncState(uid: string, state: SyncState) {
  try { localStorage.setItem(stateKey(uid), JSON.stringify(state)) } catch {}
  window.dispatchEvent(new Event('bgy-sync-state'))
}

// Perangkat hanya boleh menimpa cloud bila salinan cloud masih yang terakhir ia kenal.
export function decideAutoSync(state: SyncState, localFingerprint: string, remoteAt: string | null): AutoDecision {
  if (!state.enabled) return 'disabled'
  if (remoteAt && remoteAt !== state.remoteAt) return 'remote-newer'
  if (localFingerprint === state.lastFingerprint) return 'unchanged'
  return 'push'
}

function tableError(error: unknown, fallback: string): Error {
  const msg = `${(error as { code?: string } | null)?.code || ''} ${(error as { message?: string } | null)?.message || ''}`
  if (/user_data/i.test(msg) && (/42P01|does not exist|not exist|not find/i.test(msg))) {
    return new Error('Tabel user_data belum ada di project. Jalankan migrasi 202609290001_user_data.sql di Supabase SQL Editor.')
  }
  return new Error(fallback)
}

export interface CloudMeta { updated_at: string; fingerprint: string }

export async function cloudMeta(client: SupabaseClient, uid: string): Promise<CloudMeta | null> {
  const { data, error } = await client.from(TABLE).select('updated_at,fingerprint').eq('user_id', uid).maybeSingle()
  if (error) throw tableError(error, 'Status cloud belum bisa dibaca. Periksa koneksi atau status Pro.')
  const row = data as { updated_at?: string; fingerprint?: string } | null
  if (!row?.updated_at) return null
  return { updated_at: String(row.updated_at), fingerprint: String(row.fingerprint || '') }
}

export async function remoteSnapshotAt(client: SupabaseClient, uid: string): Promise<string | null> {
  const meta = await cloudMeta(client, uid)
  return meta ? meta.updated_at : null
}

export async function localFingerprint(): Promise<string> {
  return backupFingerprint(await createBackupText(db))
}

export async function pushSnapshot(client: SupabaseClient, uid: string): Promise<SyncState> {
  const text = await createBackupText(db)
  const fingerprint = await backupFingerprint(text)
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error('Data lokal rusak sehingga tidak bisa dikirim. Buat cadangan file dulu.') }
  const { error } = await client.from(TABLE).upsert(
    { user_id: uid, data: payload, fingerprint, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  if (error) throw tableError(error, 'Data belum terkirim ke cloud. Periksa koneksi lalu coba lagi.')
  const state = { enabled: true, lastFingerprint: fingerprint, lastSyncAt: new Date().toISOString(), remoteAt: await remoteSnapshotAt(client, uid) || '' }
  writeSyncState(uid, state)
  return state
}

export async function pullSnapshot(client: SupabaseClient, uid: string, confirm: (tables: BackupTables) => boolean | Promise<boolean>): Promise<boolean> {
  const remoteAt = await remoteSnapshotAt(client, uid)
  if (!remoteAt) throw new Error('Belum ada data di cloud untuk akun ini.')
  const { data, error } = await client.from(TABLE).select('data').eq('user_id', uid).maybeSingle()
  if (error || !(data as { data?: unknown } | null)?.data) throw new Error('Data cloud gagal diunduh. Periksa koneksi lalu coba lagi.')
  const text = JSON.stringify((data as { data: unknown }).data)
  const restored = await restoreBackupText(db, text, confirm)
  if (!restored) return false
  writeSyncState(uid, { enabled: true, lastFingerprint: await backupFingerprint(text), lastSyncAt: new Date().toISOString(), remoteAt })
  return true
}

export function disableSync(uid: string) {
  writeSyncState(uid, { ...readSyncState(uid), enabled: false })
}

// Sinkron saat aplikasi dibuka/diforeground: dorong dulu seperti biasa;
// bila cloud lebih baru DAN tidak ada editan lokal tertunda, tarik diam-diam
// (tanpa reload — daftar liveQuery ikut terbarui sendiri).
// Bila ada editan lokal, jangan timpa: kembalikan 'remote-newer' agar banner bicara.
export async function bootSync(client: SupabaseClient, uid: string): Promise<AutoDecision> {
  const decision = await autoSync(client, uid)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return decision
  try {
    const state = readSyncState(uid)
    // Adopsi perangkat baru: sync belum pernah aktif + cloud ada isi.
    // - Lokal masih kosong → ambil otomatis agar refresh/buka langsung sinkron.
    // - Lokal sudah ada isi → jangan tebak (takut menimpa): bila sidik jari beda,
    //   kembalikan 'remote-newer' agar banner meminta putusan manual.
    if (!state.enabled && !state.lastSyncAt) {
      if (decision !== 'disabled') return decision
      let meta: { updated_at?: string; fingerprint?: string } | null = null
      try {
        const res = await client.from(TABLE).select('updated_at,fingerprint').eq('user_id', uid).maybeSingle()
        if (res.error) throw res.error
        meta = res.data as typeof meta
      } catch {
        return decision
      }
      if (!meta?.updated_at) return decision
      if ((await db.kelas.count()) === 0) {
        const ok = await pullSnapshot(client, uid, () => true)
        return ok ? 'unchanged' : decision
      }
      try {
        const fingerprint = await backupFingerprint(await createBackupText(db))
        if (fingerprint && meta.fingerprint && fingerprint !== meta.fingerprint) return 'remote-newer'
      } catch {
        /* abaikan: tanpa pembanding, tetap diam */
      }
      return decision
    }
    if (decision !== 'remote-newer') return decision
    const fingerprint = await backupFingerprint(await createBackupText(db))
    if (fingerprint !== state.lastFingerprint) return decision
    const ok = await pullSnapshot(client, uid, () => true)
    return ok ? 'unchanged' : decision
  } catch {
    return decision
  }
}

// Tidak ada perubahan lokal = tidak ada query cloud, kecuali sudah lama tidak cek
// (agar banner "data lebih baru" tetap muncul maksimal 15 menit kemudian).
const IDLE_CHECK_INTERVAL = 15 * 60 * 1000
let lastIdleCheck = 0

export async function autoSync(client: SupabaseClient, uid: string): Promise<AutoDecision> {
  // Hemat kuota: offline = tidak ada query sama sekali, bahkan tidak merakit backup lokal.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'disabled'
  const state = readSyncState(uid)
  if (!state.enabled) return 'disabled'
  const text = await createBackupText(db)
  const fingerprint = await backupFingerprint(text)
  if (fingerprint === state.lastFingerprint && Date.now() - lastIdleCheck < IDLE_CHECK_INTERVAL) return 'unchanged'
  lastIdleCheck = Date.now()
  const decision = decideAutoSync(state, fingerprint, await remoteSnapshotAt(client, uid))
  if (decision === 'push') await pushSnapshot(client, uid)
  return decision
}
