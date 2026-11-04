import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { CloudDownload, CloudUpload, Cloud, Lock } from 'lucide-react'
import { documentClient } from '../../lib/document-client'
import { cloudMeta, disableSync, localFingerprint, pullSnapshot, pushSnapshot, readSyncState, sameInstant, type SyncState } from '../../lib/cloud-sync'
import type { BackupTables } from '../../lib/backup'
import { useAuthStore } from '../stores/authStore'
import ConfirmDialog from './ConfirmDialog'

const when = (value: string) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'belum pernah'

export default function CloudSyncCard() {
  const { mode, plan, user } = useAuthStore()
  const client = documentClient()
  const uid = mode === 'login' ? user?.id || null : null
  if (!client || !uid) return null
  if (plan !== 'pro') return <FreeSync client={client} uid={uid}/>
  return <ProSync client={client} uid={uid}/>
}

// Pro habis atau belum Pro: data cloud lama tetap bisa diambil, kirim baru butuh Pro.
function FreeSync({ client, uid }: { client: NonNullable<ReturnType<typeof documentClient>>; uid: string }) {
  const [remoteAt, setRemoteAt] = useState<string | null>(null)
  useEffect(() => { void cloudMeta(client, uid).then(meta => setRemoteAt(meta?.updated_at || null), () => setRemoteAt(null)) }, [uid])
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
    <div className="flex items-start gap-3"><Lock size={20} className="shrink-0 text-slate-500"/><div><h4 className="font-bold text-slate-800">Sinkron Cloud · Khusus Pro</h4><p className="mt-1">Data otomatis tersalin ke cloud dan bisa dibuka di HP maupun laptop. <Link to="/aktivasi" className="font-bold text-teal-700 underline underline-offset-2">Lihat paket Pro</Link></p></div></div>
    {remoteAt && <PullButton client={client} uid={uid} note={`Kamu masih punya data cloud (tersimpan ${when(remoteAt)}). Data ini tetap bisa diambil walau Pro tidak aktif.`}/>}
  </section>
}

function PullButton({ client, uid, note }: { client: NonNullable<ReturnType<typeof documentClient>>; uid: string; note: string }) {
  const [ask, setAsk] = useState<{ tables: BackupTables; resolve: (ok: boolean) => void } | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const pull = async () => {
    setBusy(true); setMsg('')
    try {
      const ok = await pullSnapshot(client, uid, tables => new Promise<boolean>(resolve => setAsk({ tables, resolve })))
      if (ok) { setMsg('Data cloud dipulihkan. Aplikasi dimuat ulang.'); setTimeout(() => window.location.reload(), 1200) }
    } catch (error) { setMsg(error instanceof Error ? error.message : 'Data cloud gagal diambil.') }
    finally { setBusy(false) }
  }
  return <>
    <p>{note}</p>
    <button disabled={busy} onClick={() => void pull()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300 bg-white px-4 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"><CloudDownload size={18}/>Ambil data dari cloud</button>
    {msg && <p role="status" className="text-sm font-semibold text-slate-700">{msg}</p>}
    <ReplaceDialog ask={ask} onDone={ok => { ask?.resolve(ok); setAsk(null) }}/>
  </>
}

function ReplaceDialog({ ask, onDone }: { ask: { tables: BackupTables } | null; onDone: (ok: boolean) => void }) {
  const t = ask?.tables
  return <ConfirmDialog open={!!ask} title="Ganti data perangkat ini?" confirmText="Ya, ambil dari cloud"
    message={t ? `Data cloud berisi ${t.kelas.length} kelas, ${t.siswa.length} siswa, ${t.nilai.length} nilai, dan ${t.jurnal_harian.length} jurnal. Data di perangkat ini akan DIGANTI dengan data cloud. Isi berkas Dokumen Saya di perangkat ini tetap disimpan.` : ''}
    onCancel={() => onDone(false)} onConfirm={() => onDone(true)}/>
}

function ProSync({ client, uid }: { client: NonNullable<ReturnType<typeof documentClient>>; uid: string }) {
  const [state, setState] = useState<SyncState>(() => readSyncState(uid))
  const [remoteAt, setRemoteAt] = useState<string | null | undefined>(undefined)
  const [remoteError, setRemoteError] = useState('')
  const [sameAsCloud, setSameAsCloud] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [ask, setAsk] = useState<{ tables: BackupTables; resolve: (ok: boolean) => void } | null>(null)
  const lock = useRef(false)
  const refresh = () => {
    setState(readSyncState(uid)); setRemoteError(''); setSameAsCloud(null)
    void (async () => {
      try {
        const meta = await cloudMeta(client, uid)
        setRemoteAt(meta ? meta.updated_at : null)
        if (!meta) return
        try {
          const local = await localFingerprint()
          setSameAsCloud(!!local && !!meta.fingerprint && local === meta.fingerprint)
        } catch { /* fingerprint lokal gagal: status samar, bukan error */ }
      } catch (e) { setRemoteAt(null); setRemoteError(e instanceof Error ? e.message : 'Gagal memeriksa cloud.') }
    })()
  }
  useEffect(() => {
    refresh()
    window.addEventListener('bgy-sync-state', refresh)
    return () => window.removeEventListener('bgy-sync-state', refresh)
  }, [uid])

  const act = async (fn: () => Promise<string | null>) => {
    if (lock.current) return
    lock.current = true; setBusy(true); setMsg(null)
    try { const text = await fn(); if (text) setMsg({ ok: true, text }) }
    catch (error) { setMsg({ ok: false, text: error instanceof Error ? error.message : 'Sinkron gagal. Coba lagi.' }) }
    finally { lock.current = false; setBusy(false); refresh() }
  }
  const remoteNewer = !!remoteAt && state.enabled && !sameInstant(remoteAt, state.remoteAt)
  const push = (force: boolean) => act(async () => {
    await pushSnapshot(client, uid, { force })
    return 'Data perangkat ini sudah tersimpan di cloud. Sinkron otomatis aktif.'
  })
  const upload = () => {
    if (remoteAt && !sameInstant(remoteAt, state.remoteAt)) { setConfirmOverwrite(true); return }
    void push(false)
  }
  const download = () => act(async () => {
    const ok = await pullSnapshot(client, uid, tables => new Promise<boolean>(resolve => setAsk({ tables, resolve })))
    if (!ok) return null
    setTimeout(() => window.location.reload(), 1200)
    return 'Data cloud dipulihkan. Aplikasi dimuat ulang.'
  })

  return <section className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
    <div className="flex items-start gap-3"><Cloud size={20} className="mt-0.5 shrink-0 text-teal-700"/><div className="min-w-0"><h4 className="font-bold text-slate-900">Sinkron Cloud <span className="ml-1 rounded-full bg-teal-700 px-2 py-0.5 text-xs font-bold text-white">PRO</span></h4>
      <p className="mt-1 text-sm text-slate-600">{state.enabled ? 'Aktif di perangkat ini. Perubahan dikirim otomatis; data baru dari perangkat lain diambil otomatis saat aplikasi dibuka bila tidak ada editan tertunda.' : remoteAt ? 'Cloud sudah berisi data. Ambil dulu di perangkat ini agar sinkron aktif tanpa menimpa data.' : 'Kirim data perangkat ini ke cloud untuk mengaktifkan sinkron.'}</p>
      <p className="mt-1 text-xs text-slate-500">Terakhir terkirim: {when(state.lastSyncAt)} · Data cloud: {remoteAt === undefined ? 'memeriksa…' : when(remoteAt || '')}</p>
      <p className="mt-1 text-xs text-slate-500">Isi berkas Dokumen Saya tidak ikut diunggah; hanya judul dan keterangannya.</p>
      {remoteAt && sameAsCloud === true && <p role="status" className="mt-1 text-xs font-semibold text-emerald-700">Data perangkat ini sama dengan cloud.</p>}
      {remoteAt && sameAsCloud === false && <p role="status" className="mt-1 text-xs font-semibold text-amber-700">Data cloud BERBEDA dengan perangkat ini — kirim atau ambil untuk menyamakan.</p>}
      {state.lastError && !busy && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">Sinkron otomatis gagal: {state.lastError}</p>}
      {remoteError && !busy && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{remoteError}</p>}</div></div>
    {remoteNewer && <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-sm text-sky-900">Ada data lebih baru dari perangkat lain. Pilih <strong>Ambil dari cloud</strong> untuk memakainya, atau <strong>Kirim ke cloud</strong> untuk menimpanya dengan data perangkat ini.</p>}
    <div className="grid gap-2 sm:grid-cols-2">
      <button disabled={busy} onClick={upload} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"><CloudUpload size={18}/>Kirim ke cloud</button>
      <button disabled={busy || !remoteAt} onClick={() => void download()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300 bg-white px-4 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"><CloudDownload size={18}/>Ambil dari cloud</button>
    </div>
    {state.enabled && <button disabled={busy} onClick={() => { disableSync(uid); setMsg({ ok: true, text: 'Sinkron otomatis dimatikan di perangkat ini.' }) }} className="min-h-11 text-sm font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700">Matikan sinkron otomatis di perangkat ini</button>}
    {busy && <p role="status" className="text-sm text-slate-500">Memproses…</p>}
    {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-lg p-2.5 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
    <ConfirmDialog open={confirmOverwrite} title="Timpa data cloud?" confirmText="Ya, timpa cloud"
      message="Cloud berisi data dari perangkat lain yang belum diambil perangkat ini. Mengirim sekarang akan MENIMPA data cloud itu."
      onCancel={() => setConfirmOverwrite(false)} onConfirm={() => { setConfirmOverwrite(false); void push(true) }}/>
    <ReplaceDialog ask={ask} onDone={ok => { ask?.resolve(ok); setAsk(null) }}/>
  </section>
}
