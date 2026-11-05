import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Mail } from 'lucide-react'

// Masuk tanpa kata sandi: isi email -> kode dikirim ke email -> isi kode. Link di email juga bisa diketuk.
export default function EmailCodeLogin({ client, allowSignup = true, initialEmail = '', onSuccess, submitLabel = 'Kirim kode masuk' }: {
  client: SupabaseClient; allowSignup?: boolean; initialEmail?: string; onSuccess?: () => void; submitLabel?: string
}) {
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const send = async (event?: React.FormEvent) => {
    event?.preventDefault(); if (busy || !email.trim()) return
    setBusy(true); setMessage('')
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: allowSignup, emailRedirectTo: `${window.location.origin}/` } })
    setBusy(false)
    if (error) { setMessage(/signups not allowed|not found/i.test(error.message) ? 'Email ini belum terdaftar.' : /rate|seconds|security purposes/i.test(error.message) ? 'Tunggu sekitar 1 menit sebelum minta kode lagi.' : 'Kode belum bisa dikirim. Coba lagi.'); return }
    setSent(true)
  }
  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); const token = code.replace(/\D/g, ''); if (busy || token.length < 6) return
    setBusy(true); setMessage('')
    const { error } = await client.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    setBusy(false)
    if (error) { setMessage(/expired/i.test(error.message) ? 'Kode sudah kedaluwarsa. Minta kode baru.' : 'Kode belum sesuai. Periksa lagi angkanya.'); return }
    onSuccess?.()
  }
  if (!sent) return <form onSubmit={send} className="space-y-3">
    <label className="block text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><Mail size={16}/>Email</span><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="guru@sekolah.sch.id" className="field mt-2"/></label>
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <button disabled={busy || !email.trim()} className="action-primary min-h-12 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy ? 'Mengirim…' : submitLabel}</button>
    <p className="text-center text-xs text-slate-500">Tanpa kata sandi. Kode dikirim ke email Anda.</p>
  </form>
  return <form onSubmit={verify} className="space-y-3">
    <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Kode dikirim ke <strong className="break-all">{email.trim()}</strong>. Cek kotak masuk atau Spam. Bisa juga langsung ketuk link di email itu.</p>
    <label className="block text-sm font-bold text-slate-700">Kode dari email<input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="field mt-2 text-center text-2xl font-black tracking-[0.4em]"/></label>
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <button disabled={busy || code.length < 6} className="action-primary min-h-12 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy ? 'Memeriksa…' : 'Masuk'}</button>
    <div className="flex justify-between text-sm"><button type="button" onClick={() => { setSent(false); setCode(''); setMessage('') }} className="min-h-11 font-semibold text-slate-500">Ganti email</button><button type="button" disabled={busy} onClick={() => void send()} className="min-h-11 font-semibold text-teal-700">Kirim ulang kode</button></div>
  </form>
}
