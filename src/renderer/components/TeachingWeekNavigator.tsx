import { ChevronLeft, ChevronRight } from 'lucide-react'
import { todayISO } from '../../shared/utils'
import { schoolDayStatus } from '../../shared/school-day'
import CalendarDateButton from './CalendarDateButton'

export const schoolWeekStart = (value: string) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() - (date.getDay() || 7) + 1)
  return date
}
export default function TeachingWeekNavigator({value,schoolDays,selectedDay,onChange,onSelectDay,holidays,desktopTabs=true}:{value:string;schoolDays:number;selectedDay:number;onChange:(value:string)=>void;onSelectDay:(day:number)=>void;holidays:any[];desktopTabs?:boolean}) {
  const start = schoolWeekStart(value)
  const days = Array.from({length:schoolDays},(_,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);return date})
  const format = (date:Date)=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(date)
  const move = (amount:number)=>{const date=new Date(start);date.setDate(date.getDate()+amount);onChange(todayISO(date))}
  const selectDate = (date:string)=>{onChange(date);onSelectDay(Math.min(schoolDays-1,Math.max(0,new Date(`${date}T12:00:00`).getDay()-1)))}
  const otherWeek = todayISO(start)!==todayISO(schoolWeekStart(todayISO()))
  return <div className="space-y-3">
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2">
      <button aria-label="Minggu sebelumnya" onClick={()=>move(-7)} className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><ChevronLeft size={18}/></button>
      <div className="min-w-0 flex-1 text-center text-xs font-semibold text-slate-800 sm:text-sm">{format(start)} – {format(days[days.length-1])}</div>
      <CalendarDateButton value={value} onChange={selectDate} label="Pilih tanggal dalam minggu"/>
      <button aria-label="Minggu berikutnya" onClick={()=>move(7)} className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><ChevronRight size={18}/></button>
    </div>
    {otherWeek && <div className="flex justify-end"><button onClick={()=>selectDate(todayISO())} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">Kembali ke minggu ini</button></div>}
    <div className={`grid gap-1 ${desktopTabs ? '' : 'md:hidden'}`} style={{gridTemplateColumns:`repeat(${schoolDays},minmax(0,1fr))`}} aria-label="Pilih hari">
      {days.map((date,index)=>{const status=schoolDayStatus(todayISO(date),schoolDays,holidays);const selected=selectedDay===index;return <button key={index} aria-pressed={selected} aria-label={`${format(date)}${status.active?'':`, Libur: ${status.reason}`}`} onClick={()=>onSelectDay(index)} className={`min-h-11 rounded-lg border py-2 text-xs font-semibold ${selected ? (status.active?'border-teal-700 bg-teal-700 text-white':'border-rose-700 bg-rose-700 text-white') : 'border-slate-200 bg-white text-slate-600'}`}><span>{['Sen','Sel','Rab','Kam','Jum','Sab'][index]}</span><span className={`mt-1 block text-[10px] ${!selected&&!status.active?'text-rose-700':''}`}>{status.active?date.getDate():'Libur'}</span></button>})}
    </div>
  </div>
}
