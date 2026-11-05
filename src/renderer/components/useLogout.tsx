import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentClient } from '../../lib/document-client'
import { signOutUser } from '../../lib/user-auth'
import { deleteAccountData } from '../../lib/db'
import { mayLeave } from '../../shared/unsaved-changes'
import { useAuthStore } from '../stores/authStore'
import Modal from './Modal'

// Alur keluar akun yang sama untuk menu samping dan menu profil.
export function useLogout(onDone?: () => void) {
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.user?.id || null)
  const [leaving, setLeaving] = useState(false)
  const [ask, setAsk] = useState(false)
  const [wipe, setWipe] = useState(false)
  const start = () => {
    if (!documentClient() || leaving) return
    if (!mayLeave(message => window.confirm(message), message => window.alert(message))) return
    setWipe(false); setAsk(true)
  }
  const logout = async () => {
    const client = documentClient()
    if (!client || leaving) return
    setLeaving(true)
    try {
      await signOutUser(client)
      if (wipe && uid) await deleteAccountData(uid).catch(() => {})
      setAsk(false); onDone?.(); navigate('/login', { replace: true })
    } finally { setLeaving(false) }
  }
  const dialog = ask ? <Modal title="Keluar dari akun?" onClose={() => { if (!leaving) setAsk(false) }} maxWidth="max-w-sm" footer={<>
    <button type="button" autoFocus disabled={leaving} onClick={() => setAsk(false)} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold">Batal</button>
    <button type="button" disabled={leaving} onClick={() => void logout()} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white ${wipe ? 'bg-red-600' : 'bg-teal-700'}`}>{leaving ? 'Keluar…' : wipe ? 'Keluar & hapus data' : 'Keluar'}</button>
  </>}>
    <p className="text-sm leading-relaxed text-slate-700">Data kelas tetap tersimpan di perangkat ini dan muncul lagi saat kamu masuk.</p>
    <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
      <input type="checkbox" checked={wipe} onChange={event => setWipe(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-red-600"/>
      <span><strong className="block text-slate-800">Hapus data dari perangkat ini</strong><span className="text-slate-600">Pilih ini bila memakai HP/laptop bersama. Pastikan sudah sinkron atau membuat cadangan file, karena data siswa di perangkat ini akan dihapus permanen.</span></span>
    </label>
  </Modal> : null
  return { start, leaving, dialog }
}
