import { FormEvent, useState, type ReactNode } from 'react'
import { Bug, HeartHandshake, Lightbulb, MessageCircle, Send, UsersRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { APP_VERSION } from '../../../shared/app-info'

const whatsappNumber = '6289530713597'
const categories = [
  { value: 'Saran', label: 'Saran fitur', icon: Lightbulb },
  { value: 'Kritik', label: 'Kritik penggunaan', icon: MessageCircle },
  { value: 'Lapor Masalah', label: 'Lapor masalah', icon: Bug },
]

export default function BantuanKomunitas() {
  const location = useLocation()
  const [category, setCategory] = useState('Saran')
  const [message, setMessage] = useState('')

  const sendToWhatsApp = (event: FormEvent) => {
    event.preventDefault()
    const sourcePage = sessionStorage.getItem('bgy-last-page') || location.pathname
    const text = `Halo Pak Choyy, saya ingin mengirim ${category.toLowerCase()} untuk BGY Wali Kelas:\n\n${message.trim()}\n\nHalaman: ${sourcePage}\nVersi aplikasi: ${APP_VERSION}`
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="mx-auto max-w-4xl space-y-5 pb-16">
    <header>
      <div className="flex items-center gap-2"><HeartHandshake size={22} className="text-teal-700"/><h1 className="text-xl font-extrabold text-slate-900">Bantuan & Komunitas</h1></div>
      <p className="mt-1 text-sm text-slate-500">Sampaikan pengalamanmu agar BGY Wali Kelas terus berkembang.</p>
    </header>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,.65fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4"><h2 className="font-extrabold text-slate-800">Kritik & Saran</h2><p className="mt-1 text-sm text-slate-500">Tulis pesan, lalu lanjutkan pengiriman melalui WhatsApp.</p></div>
        <form onSubmit={sendToWhatsApp} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Jenis pesan</legend>
            <div className="grid gap-2 sm:grid-cols-3">{categories.map(({value,label,icon:Icon}) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${category === value ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><input type="radio" name="feedback-category" value={value} checked={category === value} onChange={() => setCategory(value)} className="sr-only"/><Icon size={16}/>{label}</label>)}</div>
          </fieldset>
          <label className="block text-sm font-bold text-slate-700">Pesan<textarea required value={message} onChange={event => setMessage(event.target.value)} rows={6} maxLength={1200} placeholder="Ceritakan saran atau masalah yang kamu temukan..." className="field mt-2 resize-y"/></label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">Pesan baru dikirim setelah kamu menekan Kirim di WhatsApp.</p><button type="submit" disabled={!message.trim()} className="action-primary ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"><Send size={16}/>Lanjut ke WhatsApp</button></div>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><MessageCircle size={24} className="text-emerald-700"/><h2 className="mt-3 font-extrabold text-emerald-950">Kontak WhatsApp</h2><p className="mt-1 text-sm text-emerald-800">Kritik, saran, dan laporan masalah diteruskan ke Pak Choyy.</p><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Chat langsung</a></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><UsersRound size={24} className="text-teal-700"/><h2 className="mt-3 font-extrabold text-slate-800">Grup Diskusi Guru</h2><p className="mt-1 text-sm text-slate-500">Tempat bertukar pengalaman dan berdiskusi dengan pengguna BGY lainnya.</p><button type="button" disabled className="mt-4 min-h-11 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">Segera hadir</button></section>
      </aside>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800">Pertanyaan yang sering diajukan</h2>
      <div className="mt-3 divide-y divide-slate-100">
        <Faq question="Data saya disimpan di mana?">Data tersimpan di browser pada perangkat ini dan belum otomatis tersinkron ke perangkat lain.</Faq>
        <Faq question="Bagaimana jika pindah laptop?">Buka Pengaturan → Data & Cadangan, buat file .bgy, lalu pulihkan file tersebut di laptop tujuan.</Faq>
        <Faq question="Kapan sebaiknya membuat cadangan?">Aplikasi mengingatkan setiap 30 hari. Buat juga cadangan sebelum menghapus data browser atau pindah perangkat.</Faq>
        <Faq question="Mengapa WhatsApp tidak langsung mengirim?">Demi keamanan, aplikasi hanya menyiapkan pesan. Kamu tetap menekan tombol Kirim di WhatsApp.</Faq>
      </div>
    </section>
  </div>
}

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return <details className="group py-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-slate-700">{question}</summary><p className="pb-2 text-sm leading-6 text-slate-600">{children}</p></details>
}
