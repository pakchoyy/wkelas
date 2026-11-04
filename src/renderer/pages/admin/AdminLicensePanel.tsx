import { useEffect, useState } from 'react'
import { Copy, KeyRound, Link2, Search } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import ConfirmDialog from '../../components/ConfirmDialog'

type License = { email: string; code: string; is_active: boolean; paid: boolean; active_until: string | null; activated_at: string | null; purchased_at: string; user_id: string | null }
const date = (value: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const clean = (message?: string) => message?.replace(/^.*?ERROR:\s*/, '') || 'Gagal. Coba lagi.'
const missing = (message?: string) => /does not exist|could not find|PGRST202/i.test(message || '')

// Lisensi Pro: terbitkan/perpanjang manual, cabut setelah refund, dan ganti link klaim Kreacy.
export default function AdminLicensePanel({ client }: { client: SupabaseClient }) {
  const [items, setItems] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ email: '', months: 6 })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string; copy?: string } | null>(null)
  const [revoke, setRevoke] = useState<License | null>(null)

  const load = async () => {
    setLoading(true); setError('')
    const { data, error: loadError } = await client.rpc('admin_list_licenses')
    if (loadError) setError(missing(loadError.message) ? 'Jalankan migrasi 202611040001_pro_hardening.sql di Supabase lalu muat ulang.' : clean(loadError.message))
    else setItems((data || []) as License[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const act = async (fn: () => Promise<{ text: string; copy?: string }>) => {
    if (busy) return
    setBusy(true); setNotice(null)
    try { setNotice({ ok: true, ...(await fn()) }); await load() }
    catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : 'Gagal. Coba lagi.' }) }
    finally { setBusy(false) }
  }
  const issue = (event: React.FormEvent) => {
    event.preventDefault()
    void act(async () => {
      const { data, error: rpcError } = await client.rpc('admin_issue_license', { p_email: form.email.trim(), p_months: form.months })
      if (rpcError) throw new Error(clean(rpcError.message))
      const row = (Array.isArray(data) ? data[0] : data) as { email: string; code: string; active_until: string | null; activated: boolean }
      setForm({ email: '', months: 6 })
      return row.activated
        ? { text: `Pro ${row.email} diperpanjang sampai ${date(row.active_until)}.` }
        : { text: `Kode untuk ${row.email}: ${row.code}. Kirim ke pembeli; aktif ${form.months} bulan sejak dipakai.`, copy: row.code }
    })
  }
  const doRevoke = () => {
    const item = revoke; setRevoke(null)
    if (item) void act(async () => {
      const { error: rpcError } = await client.rpc('admin_revoke_license', { p_email: item.email })
      if (rpcError) throw new Error(clean(rpcError.message))
      return { text: `Pro ${item.email} dicabut. Data pengguna tidak dihapus.` }
    })
  }
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setNotice(n => n && { ...n, text: `${n.text} (tersalin)` }) } catch {} }

  const q = query.trim().toLowerCase()
  const shown = q ? items.filter(item => item.email.includes(q) || item.code.toLowerCase().includes(q)) : items

  return <div className="space-y-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-extrabold text-slate-800"><KeyRound size={18}/>Terbitkan / perpanjang Pro</h2>
      <p className="mt-1 text-sm text-slate-500">Untuk pembayaran manual. Email belum aktif → dapat kode baru. Email sudah aktif → masa Pro ditambah.</p>
      <form onSubmit={issue} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]"><fieldset disabled={busy} className="contents">
        <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email pembeli" className="field" aria-label="Email pembeli"/>
        <select value={form.months} onChange={e => setForm({ ...form, months: Number(e.target.value) })} className="field" aria-label="Lama Pro">{[6, 12].map(m => <option key={m} value={m}>{m} bulan</option>)}</select>
        <button className="action-primary min-h-11 rounded-xl px-4 text-sm font-bold">Terbitkan</button>
      </fieldset></form>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-extrabold text-slate-800"><Link2 size={18}/>Klaim dari Kreacy</h2>
      <p className="mt-1 text-sm text-slate-500">Link di halaman pesanan unik per pesanan dan hanya bisa diklaim sekali. Tidak perlu diganti. Bila pembeli gagal klaim, terbitkan manual di atas dengan email akun Wkelas mereka.</p>
    </section>

    {notice && <div role={notice.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-700'}`}>
      <p className="break-words">{notice.text}</p>
      {notice.copy && <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-2 text-xs">{notice.copy}</code><button onClick={() => void copy(notice.copy!)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-white px-3 text-sm font-bold text-teal-800"><Copy size={15}/>Salin</button></div>}
    </div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="space-y-3 border-b border-slate-100 p-4 sm:px-5"><h2 className="font-extrabold text-slate-800">{items.length} lisensi</h2>
        <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari email atau kode" className="field pl-9" aria-label="Cari lisensi"/></label></div>
      {error ? <p role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>
        : loading ? <p role="status" className="p-5 text-sm text-slate-500">Memuat…</p>
        : <div className="divide-y divide-slate-100">{shown.map(item => <article key={item.email} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
            <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800">{item.email}</p>
              <p className="mt-0.5 text-xs text-slate-500"><span className="font-mono">{item.code}</span> · {item.activated_at ? `aktif sampai ${date(item.active_until)}` : item.paid ? 'sudah dibayar, belum dipakai' : 'belum dibayar'}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.is_active ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>{item.is_active ? 'PRO' : 'Tidak aktif'}</span>
            {item.is_active && <button disabled={busy} onClick={() => setRevoke(item)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50">Cabut</button>}
          </article>)}
          {!shown.length && <p className="p-8 text-center text-sm text-slate-500">{q ? 'Tidak ada yang cocok.' : 'Belum ada lisensi.'}</p>}</div>}
    </section>

    <ConfirmDialog open={!!revoke} title="Cabut Pro?" confirmText="Cabut" message={revoke ? `Pro untuk ${revoke.email} berhenti sekarang (misalnya setelah refund). Data pengguna tidak dihapus.` : ''} onCancel={() => setRevoke(null)} onConfirm={doRevoke}/>
  </div>
}
