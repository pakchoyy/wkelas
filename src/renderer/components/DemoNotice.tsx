import { useRef, useState } from 'react'
import { FlaskConical, Trash2 } from 'lucide-react'
import { clearDemoDb } from '../../lib/demo-data'
import { useAuthStore } from '../stores/authStore'
import Modal from './Modal'

export default function DemoNotice() {
  const isDemo = useAuthStore(state => state.mode === 'demo')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  if (!isDemo) return null

  const remove = async () => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await clearDemoDb()
      window.location.reload()
    } catch {
      setError('Data contoh belum berhasil dihapus. Pilih Hapus data contoh untuk mencoba lagi.')
      locked.current = false
      setBusy(false)
    }
  }

  return <>
    <section aria-label="Mode data contoh" className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <FlaskConical size={21} aria-hidden="true" className="mt-0.5 shrink-0"/>
      <div className="min-w-0 flex-1 basis-52">
        <h2 className="text-sm font-bold">Anda sedang memakai data contoh</h2>
        <p className="mt-1 text-sm leading-relaxed">Guru, siswa, dan kegiatan di sini untuk mencoba aplikasi. Perubahan tersimpan di ruang contoh. Hapus data contoh saat siap membuat kelas sendiri.</p>
      </div>
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">
        <Trash2 size={17} aria-hidden="true"/>Hapus data contoh
      </button>
    </section>
    {confirming && <Modal title="Hapus data contoh?" onClose={() => { if (!locked.current) setConfirming(false) }} footer={<>
      <button autoFocus type="button" disabled={busy} onClick={() => setConfirming(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50">Batal</button>
      <button type="button" disabled={busy} onClick={remove} className="min-h-11 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{busy ? 'Menghapus…' : 'Hapus data contoh'}</button>
    </>}>
      <p className="text-sm leading-relaxed text-slate-700">Semua data di ruang contoh, termasuk siswa atau perubahan yang Anda tambahkan saat mencoba, akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">Data kelas pribadi yang tersimpan terpisah tetap aman. Setelah selesai, Anda kembali ke kelas pribadi atau pengaturan kelas pertama.</p>
      <p role="status" className="mt-3 text-sm">{busy ? 'Menghapus data contoh…' : ''}</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </Modal>}
  </>
}
