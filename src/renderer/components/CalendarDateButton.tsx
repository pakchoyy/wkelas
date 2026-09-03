import { CalendarDays } from 'lucide-react'

export default function CalendarDateButton({value,onChange,max,label='Pilih tanggal'}:{value:string;onChange:(date:string)=>void;max?:string;label?:string}) {
  const choose = (date:string) => { if(date && (!max || date <= max)) onChange(date) }
  return <label className="action-mint relative grid size-11 shrink-0 place-items-center rounded-xl border focus-within:ring-2 focus-within:ring-teal-600">
    <CalendarDays size={19}/>
    <input type="date" aria-label={label} value={value} max={max} onClick={e => e.currentTarget.showPicker?.()} onInput={e => choose(e.currentTarget.value)} onChange={e => choose(e.target.value)} className="date-picker-input"/>
  </label>
}
