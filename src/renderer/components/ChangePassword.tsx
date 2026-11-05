import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { documentClient } from '../../lib/document-client'

// Ganti kata sandi akun yang sedang masuk (tidak perlu kata sandi lama).
export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); const client = documentClient(); if (!client || busy) return
    if (pw.length < 8) { setMsg({ ok: false, text: 'Kata sandi minimal 8 karakter.' }); return }
    if (pw !== pw2) { setMsg({ ok: false, text: 'Ulangi kata sandi belum sama.' }); return }
    setBusy(true); setMsg(null)
    const { error } = await client.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setMsg({ ok: false, text: /same|different/i.test(error.message) ? 'Kata sandi baru harus berbeda dari yang lama.' : /reauth|nonce/i.test(error.message) ? 'Demi keamanan, keluar lalu masuk lagi, kemudian ulangi.' : 'Kata sandi belum berhasil diganti. Coba lagi.' }); return }
    setPw(''); setPw2(''); setMsg({ ok: true, text: 'Kata sandi berhasil diganti. Pakai kata sandi baru saat masuk berikutnya.' })
  }
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <button type="button" onClick={() => { setOpen(v => !v); setMsg(null) }} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-bold text-slate-800"><KeyRound size={17} className="text-teal-700"/>Ganti kata sandi</button>
    {open && <form onSubmit={save} className="mt-2 space-y-3">
      <label className="block text-sm font-bold">Kata sandi baru<input type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={e => setPw(e.target.value)} className="field mt-1.5" placeholder="Minimal 8 karakter"/></label>
      <label className="block text-sm font-bold">Ulangi kata sandi baru<input type="password" autoComplete="new-password" minLength={8} required value={pw2} onChange={e => setPw2(e.target.value)} className="field mt-1.5"/></label>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>}
      <button disabled={busy} className="min-h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Simpan kata sandi'}</button>
    </form>}
  </div>
}
