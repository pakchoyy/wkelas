import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from './db'
import { createBackupText, restoreBackupText, type BackupTables } from './backup'
import { backupFingerprint } from './backup-history'

export const SYNC_BUCKET = 'user-sync'
const FILE = 'latest.json.gz'

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

async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream, { headers: { 'content-type': 'application/gzip' } }).blob()
}
async function gunzip(blob: Blob): Promise<string> {
  return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
}

export async function remoteSnapshotAt(client: SupabaseClient, uid: string): Promise<string | null> {
  const { data, error } = await client.storage.from(SYNC_BUCKET).list(uid, { limit: 10 })
  if (error) throw new Error('Status cloud belum bisa dibaca. Periksa koneksi atau status Pro.')
  const file = (data || []).find(item => item.name === FILE)
  return file ? String(file.updated_at || file.created_at || '') || null : null
}

export async function pushSnapshot(client: SupabaseClient, uid: string): Promise<SyncState> {
  const text = await createBackupText(db)
  const fingerprint = await backupFingerprint(text)
  const { error } = await client.storage.from(SYNC_BUCKET).upload(`${uid}/${FILE}`, await gzip(text), { upsert: true, contentType: 'application/gzip', cacheControl: '0' })
  if (error) throw new Error('Data belum terkirim ke cloud. Periksa koneksi lalu coba lagi.')
  const state = { enabled: true, lastFingerprint: fingerprint, lastSyncAt: new Date().toISOString(), remoteAt: await remoteSnapshotAt(client, uid) || '' }
  writeSyncState(uid, state)
  return state
}

export async function pullSnapshot(client: SupabaseClient, uid: string, confirm: (tables: BackupTables) => boolean | Promise<boolean>): Promise<boolean> {
  const remoteAt = await remoteSnapshotAt(client, uid)
  if (!remoteAt) throw new Error('Belum ada data di cloud untuk akun ini.')
  const { data, error } = await client.storage.from(SYNC_BUCKET).download(`${uid}/${FILE}`)
  if (error || !data) throw new Error('Data cloud gagal diunduh. Periksa koneksi lalu coba lagi.')
  const text = await gunzip(data)
  const restored = await restoreBackupText(db, text, confirm)
  if (!restored) return false
  writeSyncState(uid, { enabled: true, lastFingerprint: await backupFingerprint(text), lastSyncAt: new Date().toISOString(), remoteAt })
  return true
}

export function disableSync(uid: string) {
  writeSyncState(uid, { ...readSyncState(uid), enabled: false })
}

export async function autoSync(client: SupabaseClient, uid: string): Promise<AutoDecision> {
  const state = readSyncState(uid)
  if (!state.enabled) return 'disabled'
  const text = await createBackupText(db)
  const decision = decideAutoSync(state, await backupFingerprint(text), await remoteSnapshotAt(client, uid))
  if (decision === 'push') await pushSnapshot(client, uid)
  return decision
}
