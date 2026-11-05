import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/db'
import { AVATAR_KEY, AVATAR_PHOTO_KEY, guessAvatar, type AvatarChoice } from '../../shared/avatar'
import { Camera, Trash2 } from 'lucide-react'
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
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState('')
  useEffect(() => {
    const sub = liveQuery(async () => ({ choice: (await db.pengaturan.get(AVATAR_KEY))?.value || 'auto', photo: (await db.pengaturan.get(AVATAR_PHOTO_KEY))?.value || null })).subscribe({ next: (v) => { setChoice(v.choice); setPhoto(v.photo) }, error: () => {} })
    return () => sub.unsubscribe()
  }, [])
  // Foto dikecilkan ke 192px JPEG (~15 KB) agar ringan disimpan dan disinkron.
  const upload = async (file: File | undefined) => {
    setPhotoError(''); if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Pilih file gambar (JPG/PNG).'); return }
    try {
      const bitmap = await createImageBitmap(file)
      const size = 192, side = Math.min(bitmap.width, bitmap.height)
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
      canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      const now = new Date().toISOString()
      await db.pengaturan.bulkPut([{ key: AVATAR_PHOTO_KEY, value: dataUrl, updated_at: now }, { key: AVATAR_KEY, value: 'foto', updated_at: now }])
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { setPhotoError('Foto belum bisa dibaca. Coba foto lain.') }
  }
  const removePhoto = async () => { await db.pengaturan.delete(AVATAR_PHOTO_KEY); if (choice === 'foto') await pick('auto') }
  const pick = async (value: AvatarChoice) => {
    setChoice(value); setSaved(false)
    await db.pengaturan.put({ key: AVATAR_KEY, value, updated_at: new Date().toISOString() })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  return <section className="mt-6 border-t border-slate-100 pt-5">
    <div className="flex items-baseline justify-between gap-2"><h3 className="font-extrabold">Avatar profil</h3>{saved && <span role="status" className="text-xs font-bold text-teal-700">Tersimpan</span>}</div>
    <p className="mt-1 text-xs text-slate-500">Tampil di pojok kanan atas. {pro ? 'Ikut tersinkron ke HP dan laptop lain.' : 'Tersimpan di perangkat ini.'}</p>
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
      {photo ? <img src={photo} alt="Foto profil" className="size-14 rounded-full object-cover"/> : <span className="grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400"><Camera size={22}/></span>}
      <div className="flex flex-1 flex-wrap gap-2">
        <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white focus-within:ring-2 focus-within:ring-teal-400"><Camera size={16}/>{photo ? 'Ganti foto' : 'Unggah foto'}<input type="file" accept="image/*" aria-label="Unggah foto profil" onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} className="absolute inset-0 cursor-pointer opacity-0"/></label>
        {photo && <button type="button" onClick={() => void removePhoto()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><Trash2 size={15}/>Hapus</button>}
      </div>
      {photoError && <p role="alert" className="w-full text-sm text-red-700">{photoError}</p>}
    </div>
    <div role="radiogroup" aria-label="Avatar profil" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
      {(photo ? [{ value: 'foto' as AvatarChoice, label: 'Foto saya' }, ...OPTIONS] : OPTIONS).map(option => {
        const kind = option.value === 'auto' ? guessAvatar(name) : option.value
        const active = choice === option.value
        return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => void pick(option.value)} className={`flex min-h-11 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-bold ${active ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><TeacherAvatar kind={kind} name={name} photo={photo} size={40}/>{option.label}</button>
      })}
    </div>
  </section>
}
