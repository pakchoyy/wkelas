import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { readTheme, setTheme, type ThemePref } from '../theme'

const options: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Ikuti perangkat', icon: Monitor },
]

export default function ThemePicker() {
  const [pref, setPref] = useState<ThemePref>(readTheme)
  return <fieldset className="space-y-2">
    <legend className="font-extrabold">Tampilan</legend>
    <div className="grid grid-cols-3 gap-2">
      {options.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={pref === value} onClick={() => { setTheme(value); setPref(value) }}
        className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs font-bold ${pref === value ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Icon size={18}/>{label}</button>)}
    </div>
  </fieldset>
}
