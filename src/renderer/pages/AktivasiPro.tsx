import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeCheck, Check, ExternalLink, Gift, KeyRound, MessageCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { documentClient } from '../../lib/document-client'
import { ADMIN_WA, PRO_BUY_URL, PRO_PRICE, activatePro, claimPro, clearPendingActivation, refreshPlan, subscriptionStatus, takePendingActivation } from '../../lib/pro-license'
import { proDaysLeft } from '../../shared/subscription'
import { useAuthStore } from '../stores/authStore'

// [fitur, gratis, pro]: true = ✓, false = –, teks = nilai
const COMPARE: [string, boolean | string, boolean | string][] = [
  ['Data siswa, presensi, nilai, perilaku', true, true],
  ['Jurnal, rencana, jadwal, kalender, tugas', true, true],
  ['Laporan & ekspor Excel', true, true],
  ['Cadangan file manual', true, true],
  ['Pakai offline sebagai aplikasi', true, true],
  ['Jumlah kelas', '1 kelas', 'Banyak'],
  ['Naik kelas ke tahun ajaran baru', false, true],
  ['Sinkron otomatis HP & laptop', false, true],
  ['Cadangan cloud (aman saat ganti HP)', false, true],
]
const Mark = ({ value }: { value: boolean | string }) => typeof value === 'string'
  ? <span className="text-sm font-bold text-slate-800">{value}</span>
  : value ? <Check size={20} strokeWidth={3} className="mx-auto text-emerald-600" aria-label="Ya"/> : <span className="text-slate-400" aria-label="Tidak">–</span>
const fmt = (value: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value)) : ''

export default function AktivasiPro() {
  const client = documentClient()
  const { plan, proUntil, user, mode } = useAuthStore()
  const [params] = useSearchParams()
  const pending = useRef(takePendingActivation()).current
  const [order] = useState(params.get('order') || pending?.order || '')
  const [sig] = useState(params.get('sig') || pending?.sig || '')
  const klaim = !!order && !!sig
  const [email, setEmail] = useState(params.get('email') || pending?.email || user?.email || '')
  const [kode, setKode] = useState(params.get('kode') || pending?.kode || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [claimed, setClaimed] = useState(false)
  const loggedIn = mode === 'login' && !!user?.id
  const daysLeft = proDaysLeft(proUntil)

  useEffect(() => { clearPendingActivation() }, [])
  useEffect(() => { if (user?.email && !email) setEmail(user.email) }, [user?.email])

  const run = async (fn: () => Promise<string>) => {
    if (!client || busy) return
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }) }
    catch (error) { setMsg({ ok: false, text: error instanceof Error ? error.message : 'Belum berhasil. Coba lagi.' }) }
    finally { setBusy(false) }
  }
  const claim = () => void run(async () => {
    if (!loggedIn) throw new Error('Masuk ke akun terlebih dahulu agar Pro tersimpan di akunmu.')
    const result = await claimPro(client!, order, sig)
    await refreshPlan(client!, user!.id!)
    setClaimed(true)
    return `Pro aktif sampai ${fmt(result.active_until)}. Terima kasih!`
  })
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
    const status = loggedIn && user?.email ? await subscriptionStatus(client!, user.email) : null
    if (useAuthStore.getState().plan === 'pro') return status?.active_until ? `Akun ini Pro sampai ${fmt(status.active_until)}.` : 'Akun ini berstatus Pro.'
    return status ? 'Masa Pro untuk akun ini sudah berakhir.' : 'Belum ada Pro aktif untuk akun ini.'
  })

  if (!client) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aktivasi Pro membutuhkan koneksi cloud yang belum dikonfigurasi.</p>

  const result = msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>

  return <div className="mx-auto max-w-2xl space-y-5">
    <div><h1 className="text-2xl font-black text-slate-900">Paket Pro</h1><p className="mt-1 text-sm text-slate-500">{PRO_PRICE} · berlaku 6 bulan sejak aktif.</p></div>

    {klaim && !claimed && <section className="rounded-2xl border-2 border-teal-600 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><Gift size={20}/></span><div className="min-w-0">
        <h2 className="text-lg font-extrabold text-slate-900">Klaim Pro dari pembelianmu</h2>
        <p className="mt-1 text-sm text-slate-600">{loggedIn ? <>Pro akan aktif di akun <strong className="break-all">{user?.email}</strong>.</> : 'Masuk dulu dengan akun yang kamu pakai di Wali Kelas, lalu buka lagi link klaim dari halaman pesanan.'}</p></div></div>
      {loggedIn ? <button disabled={busy} onClick={claim} className="mt-4 min-h-12 w-full rounded-xl bg-teal-700 px-5 text-base font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Memproses…' : 'Klaim Pro'}</button>
        : <Link to="/login" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-5 text-base font-bold text-white">Masuk</Link>}
      {result && <div className="mt-3">{result}</div>}
    </section>}

    {plan === 'pro'
      ? <section className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5"><BadgeCheck size={24} className="shrink-0 text-teal-700"/><div><h2 className="font-extrabold text-teal-950">Akun ini sudah Pro</h2>
          <p className="mt-1 text-sm text-teal-900">{proUntil ? `Aktif sampai ${fmt(proUntil)}${daysLeft !== null && daysLeft <= 14 ? ` (${Math.max(daysLeft, 0)} hari lagi)` : ''}.` : 'Aktif.'}</p>
          {daysLeft !== null && daysLeft <= 14 && <p className="mt-2 text-sm text-teal-900">Untuk memperpanjang, beli lagi lalu buka link klaim yang baru. Sisa masa aktifmu tetap ditambahkan.</p>}</div></section>
      : <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><Sparkles size={20}/></span><div><h2 className="text-lg font-extrabold text-teal-950">Pro · {PRO_PRICE}</h2>
            <p className="mt-1 text-sm text-teal-900">Data kelas sama di HP & laptop, cadangan cloud, dan banyak kelas.</p></div></div>
          {PRO_BUY_URL ? <a href={PRO_BUY_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-base font-bold text-white hover:bg-teal-800 sm:w-auto">Beli Pro <ExternalLink size={16}/></a>
            : <a href={ADMIN_WA} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-base font-bold text-white hover:bg-teal-800 sm:w-auto"><MessageCircle size={16}/>Beli lewat WhatsApp admin</a>}
        </section>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <h2 className="px-5 pt-5 font-extrabold text-slate-900">Perbandingan Gratis vs Pro</h2>
      <table className="mt-3 w-full text-sm">
        <thead><tr className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><th scope="col" className="px-4 py-3 text-left">Fitur</th><th scope="col" className="w-20 px-2 py-3 text-center">Gratis</th><th scope="col" className="w-20 bg-teal-50 px-2 py-3 text-center text-teal-800">Pro</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{COMPARE.map(([label, free, pro]) => <tr key={label}><th scope="row" className="px-4 py-3 text-left font-semibold text-slate-700">{label}</th><td className="px-2 py-3 text-center"><Mark value={free}/></td><td className="bg-teal-50/60 px-2 py-3 text-center"><Mark value={pro}/></td></tr>)}</tbody>
        <tfoot><tr className="border-t border-slate-200"><th scope="row" className="px-4 py-3 text-left font-semibold text-slate-700">Harga</th><td className="px-2 py-3 text-center font-bold text-slate-800">Rp0</td><td className="bg-teal-50 px-2 py-3 text-center text-xs font-black text-teal-800">Rp23.000<br/>/semester</td></tr></tfoot>
      </table>
      <div className="m-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-teal-700"/><p><strong>Saat masa Pro habis:</strong> data di perangkat tidak hilang dan data cloud tetap bisa diambil. Yang berhenti hanya sinkron otomatis dan penambahan kelas baru.</p></div>
    </section>

    <details className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" open={!!kode}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-extrabold text-slate-900"><KeyRound size={18} className="text-slate-600"/>Punya kode aktivasi dari admin?</summary>
      <p className="mt-1 text-sm text-slate-500">Masukkan kode <strong>BGY-XXXXX</strong>. Email harus sama dengan email akun yang sedang masuk.</p>
      <form onSubmit={activate} className="mt-4 space-y-3"><fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">Email akun<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field mt-1.5" placeholder="guru@sekolah.sch.id"/></label>
        <label className="block text-sm font-bold text-slate-700">Kode aktivasi<input required value={kode} onChange={e => setKode(e.target.value.toUpperCase())} className="field mt-1.5 font-mono tracking-wider" placeholder="BGY-XXXXX" autoCapitalize="characters" spellCheck={false}/></label>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Memproses…' : 'Aktifkan Pro'}</button>
          <button type="button" onClick={check} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={16}/>Cek status</button>
        </div>
      </fieldset></form>
      {!klaim && result && <div className="mt-3">{result}</div>}
    </details>
    <a href={ADMIN_WA} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-700 hover:underline"><MessageCircle size={16}/>Kendala pembelian atau aktivasi? Hubungi admin</a>
  </div>
}
