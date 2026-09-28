import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Check, ExternalLink, KeyRound, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import { documentClient } from '../../lib/document-client'
import { ADMIN_WA, LYNK_URL, activatePro, clearPendingActivation, refreshPlan, subscriptionStatus, takePendingActivation } from '../../lib/pro-license'
import { useAuthStore } from '../stores/authStore'

const PERKS = ['Sinkron & cadangan cloud: data sama di HP dan laptop', 'Kelola banyak kelas', 'Naik kelas: salin siswa ke tahun ajaran baru']
const fmt = (value: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value)) : ''

export default function AktivasiPro() {
  const client = documentClient()
  const { plan, proUntil, user, mode } = useAuthStore()
  const [params] = useSearchParams()
  const pending = useRef(takePendingActivation()).current
  const [email, setEmail] = useState(params.get('email') || pending?.email || user?.email || '')
  const [kode, setKode] = useState(params.get('kode') || pending?.kode || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const loggedIn = mode === 'login' && !!user?.id

  useEffect(() => { clearPendingActivation() }, [])

  const run = async (fn: () => Promise<string>) => {
    if (!client || busy) return
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }) }
    catch (error) { setMsg({ ok: false, text: error instanceof Error ? error.message : 'Belum berhasil. Coba lagi.' }) }
    finally { setBusy(false) }
  }
  const activate = (event: React.FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!loggedIn) throw new Error('Masuk ke akun terlebih dahulu agar Pro tersimpan di akunmu.')
      const result = await activatePro(client!, email, kode)
      await refreshPlan(client!, user!.id!)
      return `Pro aktif sampai ${fmt(result.active_until)}. Terima kasih!`
    })
  }
  const check = () => void run(async () => {
    if (loggedIn) await refreshPlan(client!, user!.id!)
    const status = email.trim() ? await subscriptionStatus(client!, email) : null
    if (status?.is_pro) return `Email ${email.trim()} berstatus Pro sampai ${fmt(status.active_until)}.`
    if (useAuthStore.getState().plan === 'pro') return 'Akun ini berstatus Pro.'
    return status ? `Masa Pro untuk ${email.trim()} sudah berakhir.` : 'Belum ada Pro aktif untuk email ini. Masukkan kode aktivasi setelah pembelian.'
  })

  if (!client) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aktivasi Pro membutuhkan koneksi cloud yang belum dikonfigurasi.</p>

  return <div className="mx-auto max-w-2xl space-y-5">
    <div><h1 className="text-2xl font-black text-slate-900">Aktivasi Pro</h1><p className="mt-1 text-sm text-slate-500">Pro Wali Kelas berlaku per semester (6 bulan) sejak aktivasi.</p></div>

    {plan === 'pro'
      ? <section className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5"><BadgeCheck size={24} className="shrink-0 text-teal-700"/><div><h2 className="font-extrabold text-teal-950">Akun ini sudah Pro</h2><p className="mt-1 text-sm text-teal-900">{proUntil ? `Aktif sampai ${fmt(proUntil)}.` : 'Aktif.'}</p></div></section>
      : <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><Sparkles size={20}/></span><div><h2 className="text-lg font-extrabold text-teal-950">Pro Semester</h2>
          <ul className="mt-3 space-y-2 text-sm text-teal-900">{PERKS.map(item => <li key={item} className="flex items-center gap-2"><Check size={16} className="shrink-0"/>{item}</li>)}</ul></div></div>
          {LYNK_URL ? <a href={LYNK_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800">Beli Pro di Lynk <ExternalLink size={16}/></a>
            : <p className="mt-5 rounded-xl border border-dashed border-teal-300 bg-white/70 p-3 text-sm font-semibold text-teal-800">Pembelian Pro segera dibuka.</p>}
        </section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2"><KeyRound size={18} className="text-slate-600"/><h2 className="font-extrabold text-slate-900">Kode Aktivasi</h2></div>
      <p className="mt-1 text-sm text-slate-500">Masukkan email pembelian dan kode <strong>BGY-XXXXX</strong> yang didapat setelah pembayaran.</p>
      <form onSubmit={activate} className="mt-4 space-y-3"><fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">Email pembelian<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field mt-1.5" placeholder="guru@sekolah.sch.id"/></label>
        <label className="block text-sm font-bold text-slate-700">Kode aktivasi<input required value={kode} onChange={e => setKode(e.target.value.toUpperCase())} className="field mt-1.5 font-mono tracking-wider" placeholder="BGY-XXXXX" autoCapitalize="characters" spellCheck={false}/></label>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Memproses…' : 'Aktifkan Pro'}</button>
          <button type="button" onClick={check} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={16}/>Cek status</button>
        </div>
      </fieldset></form>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 rounded-xl p-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      <a href={ADMIN_WA} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-teal-700 hover:underline"><MessageCircle size={16}/>Kendala aktivasi? Hubungi admin</a>
    </section>
  </div>
}
