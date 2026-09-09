import { useEffect, useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type Feedback = { id:string; category:string; message:string; page:string|null; app_version:string|null; status:'baru'|'dibaca'|'selesai'; created_at:string; user_id:string|null }

export default function AdminFeedbackPanel({ client }: { client: SupabaseClient }) {
  const [items,setItems] = useState<Feedback[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    const { data, error: loadError } = await client.from('feedback').select('*').order('created_at',{ascending:false}).limit(100)
    if (loadError) setError('Masukan belum tersedia. Jalankan SQL Admin Masukan di Supabase lalu muat ulang.')
    else setItems((data || []) as Feedback[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])
  const updateStatus = async (id:string,status:Feedback['status']) => {
    const { error: updateError } = await client.from('feedback').update({status}).eq('id',id)
    if (updateError) setError('Status masukan belum berhasil diperbarui.')
    else setItems(current => current.map(item => item.id === id ? {...item,status} : item))
  }
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-800">Masukan pengguna</h2><p className="mt-1 text-sm text-slate-500">Kritik, saran, dan laporan masalah yang dikirim dari aplikasi.</p></div>
    {error && <p role="alert" className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {loading ? <p role="status" className="p-5 text-sm text-slate-500">Memuat masukan…</p> : <div className="divide-y divide-slate-100">{items.map(item => <article key={item.id} className="flex items-start gap-3 p-4 sm:p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><MessageCircle size={18}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold capitalize text-slate-800">{item.category}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status==='baru'?'bg-amber-100 text-amber-800':item.status==='dibaca'?'bg-blue-100 text-blue-800':'bg-emerald-100 text-emerald-800'}`}>{item.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString('id-ID')}{item.page?` · ${item.page}`:''}{item.app_version?` · v${item.app_version}`:''}</p></div><label className="sr-only" htmlFor={`feedback-status-${item.id}`}>Status masukan</label><select id={`feedback-status-${item.id}`} value={item.status} onChange={event=>void updateStatus(item.id,event.target.value as Feedback['status'])} className="field min-h-10 w-auto py-2 text-xs font-bold"><option value="baru">Baru</option><option value="dibaca">Dibaca</option><option value="selesai">Selesai</option></select>{item.status==='selesai'&&<Check size={18} className="mt-3 text-emerald-600" aria-label="Selesai"/>}</article>)}{!items.length&&<p className="p-8 text-center text-sm text-slate-500">Belum ada masukan.</p>}</div>}
  </section>
}
