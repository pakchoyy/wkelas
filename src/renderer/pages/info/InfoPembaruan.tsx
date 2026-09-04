import { BellRing, CheckCircle2 } from 'lucide-react'
import { APP_UPDATED_AT, APP_UPDATES, APP_VERSION } from '../../../shared/app-info'

export default function InfoPembaruan() {
  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><BellRing size={22}/></span><div><h1 className="text-2xl font-black text-slate-800">Yang Baru</h1><p className="text-sm text-slate-500">Versi {APP_VERSION} · diperbarui {APP_UPDATED_AT}</p></div></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-slate-800">Pembaruan terbaru</h2>
      <ul className="mt-4 space-y-3">{APP_UPDATES.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 shrink-0 text-teal-600" size={18}/><span>{item}</span></li>)}</ul>
    </section>
  </div>
}
