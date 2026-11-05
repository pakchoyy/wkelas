import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/db'
import { AVATAR_KEY, guessAvatar, type AvatarChoice } from '../../shared/avatar'
import { useAuthStore } from '../stores/authStore'
import TeacherAvatar from './TeacherAvatar'

const OPTIONS: { value: AvatarChoice; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'pak', label: 'Pak Guru' },
  { value: 'bu-hijab', label: 'Bu Guru (hijab)' },
  { value: 'bu', label: 'Bu Guru' },
  { value: 'inisial', label: 'Inisial' },
]

// Pilihan avatar disimpan di perangkat (tabel pengaturan); akun Pro ikut tersinkron ke cloud.
export default function AvatarPicker({ name }: { name: string }) {
  const pro = useAuthStore((s) => s.plan === 'pro')
  const [choice, setChoice] = useState<string>('auto')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const sub = liveQuery(() => db.pengaturan.get(AVATAR_KEY)).subscribe({ next: (row) => setChoice(row?.value || 'auto'), error: () => {} })
    return () => sub.unsubscribe()
  }, [])
  const pick = async (value: AvatarChoice) => {
    setChoice(value); setSaved(false)
    await db.pengaturan.put({ key: AVATAR_KEY, value, updated_at: new Date().toISOString() })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  return <section className="mt-6 border-t border-slate-100 pt-5">
    <div className="flex items-baseline justify-between gap-2"><h3 className="font-extrabold">Avatar profil</h3>{saved && <span role="status" className="text-xs font-bold text-teal-700">Tersimpan</span>}</div>
    <p className="mt-1 text-xs text-slate-500">Tampil di pojok kanan atas. {pro ? 'Ikut tersinkron ke HP dan laptop lain.' : 'Tersimpan di perangkat ini.'}</p>
    <div role="radiogroup" aria-label="Avatar profil" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
      {OPTIONS.map(option => {
        const kind = option.value === 'auto' ? guessAvatar(name) : option.value
        const active = choice === option.value
        return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => void pick(option.value)} className={`flex min-h-11 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-bold ${active ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><TeacherAvatar kind={kind} name={name} size={40}/>{option.label}</button>
      })}
    </div>
  </section>
}
