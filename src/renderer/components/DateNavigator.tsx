import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

export default function DateNavigator({value,label,onChange,onPrevious,onNext,nextDisabled=false,weekly=false,max}:{value:string;label:string;onChange:(date:string)=>void;onPrevious:()=>void;onNext:()=>void;nextDisabled?:boolean;weekly?:boolean;max?:string}) {
  const [expanded,setExpanded]=useState(false)
  return <div className="rounded-xl border border-slate-200 bg-white p-2">
    <div className="flex items-center gap-1">
      <button aria-label={weekly ? 'Minggu sebelumnya' : 'Tanggal sebelumnya'} onClick={onPrevious} className="size-11 shrink-0 grid place-items-center rounded-lg text-slate-600"><ChevronLeft size={18}/></button>
      <button aria-label={`Pilih tanggal: ${label}`} aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} className="min-h-11 min-w-0 flex-1 flex items-center justify-center gap-2 rounded-lg px-1 text-xs sm:text-sm font-bold text-slate-800"><span>{label}</span><CalendarDays size={16} className="shrink-0 text-teal-600"/></button>
      <button aria-label={weekly ? 'Minggu berikutnya' : 'Tanggal berikutnya'} disabled={nextDisabled} onClick={onNext} className="size-11 shrink-0 grid place-items-center rounded-lg text-slate-600 disabled:opacity-30"><ChevronRight size={18}/></button>
    </div>
    {expanded && <label className="mt-2 flex flex-wrap justify-center items-center gap-2 text-xs text-slate-500">Pilih tanggal<input type="date" value={value} max={max} onChange={e=>{if(e.target.value){onChange(e.target.value);setExpanded(false)}}} className="field !w-auto min-w-0"/></label>}
  </div>
}
