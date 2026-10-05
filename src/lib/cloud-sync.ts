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

export async function remoteSnapshotAt(client: SupabaseClient, uid: string): Promise<string | null> {
  const { data, error } = await client.from(TABLE).select('updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw tableError(error, 'Status cloud belum bisa dibaca. Periksa koneksi atau status Pro.')
  const at = (data as { updated_at?: string } | null)?.updated_at
  return at ? String(at) : null
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
