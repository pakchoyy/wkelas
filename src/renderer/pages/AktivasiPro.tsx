import { useState } from 'react'
import { Check, ExternalLink, KeyRound, Sparkles } from 'lucide-react'

// Isi dengan URL pembayaran Lynk.id saat paket Pro mulai dijual.
const LYNK_PAYMENT_URL = ''

export default function AktivasiPro() {
  const [kode, setKode] = useState('')
  const [message, setMessage] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(kode.trim() ? 'Kode akan diperiksa setelah sistem aktivasi Pro diaktifkan.' : 'Masukkan kode aktivasi terlebih dahulu.')
  }
  return <main className="mx-auto max-w-2xl space-y-5">
    <div><h1 className="text-2xl font-black text-slate-900">Aktivasi Pro</h1><p className="mt-1 text-sm text-slate-500">Buka fitur cloud dan penyimpanan dokumen dengan paket Pro.</p></div>
    <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-600 text-white"><Sparkles size={20}/></span><div><h2 className="text-lg font-extrabold text-teal-950">Pro Semester</h2><p className="mt-1 text-2xl font-black text-teal-900">Rp20.000 <span className="text-sm font-semibold">/ 6 bulan</span></p><ul className="mt-4 space-y-2 text-sm text-teal-900">{['Sinkronisasi dan backup cloud','Upload dokumen perangkat ajar','Export laporan lebih lengkap'].map(item=><li key={item} className="flex items-center gap-2"><Check size={16} className="shrink-0"/>{item}</li>)}</ul></div></div>{LYNK_PAYMENT_URL ? <a href={LYNK_PAYMENT_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800">Bayar lewat Lynk.id <ExternalLink size={16}/></a> : <p className="mt-5 rounded-xl border border-dashed border-teal-300 bg-white/70 p-3 text-sm font-semibold text-teal-800">Link pembayaran Lynk.id akan ditampilkan di sini saat Pro mulai dijual.</p>}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><KeyRound size={18} className="text-slate-600"/><h2 className="font-extrabold text-slate-900">Sudah punya kode aktivasi?</h2></div><p className="mt-1 text-sm text-slate-500">Masukkan kode dari email atau pesan setelah pembayaran.</p><form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row"><input name="activation-code" value={kode} onChange={event=>setKode(event.target.value)} placeholder="Contoh: WK-XXXX-XXXX" className="field min-w-0 flex-1"/><button className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-700">Aktifkan Pro</button></form>{message&&<p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}</section>
  </main>
}
