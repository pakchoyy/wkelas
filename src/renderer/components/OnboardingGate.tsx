import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Cloud, Lock, Sparkles } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { activateDemoDb, activateMainDb, db } from '../../lib/db'
import { seedDemoData } from '../../lib/demo-data'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { getPhaseForGrade } from '../../shared/mapelRecommendations'
import { initialSetup, saveInitialClass, type SetupData } from '../../lib/onboarding'
import { bootSync, pullSnapshot, remoteSnapshotAt } from '../../lib/cloud-sync'
import { signOutUser, userClient, useUserSession } from '../../lib/user-auth'
import { refreshPlan } from '../../lib/pro-license'

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const cloud = userClient()
  const { user, checking: authChecking } = useUserSession(cloud)
  const demo = useAuthStore((s) => s.mode === 'demo')
  const [checking, setChecking] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [checkError, setCheckError] = useState(false)

  const accountId = user?.id || null
  useEffect(() => {
    // Tunggu sesi selesai agar database yang dibaca milik akun yang benar.
    if (authChecking) return
    let cancelled = false
    setChecking(true)
    ;(async () => {
      // Perangkat baru: adopsi data cloud dulu (bila Pro) SEBELUM memutuskan tampil setup,
      // karena mesin sync di Layout belum terpasang pada tahap ini. Gagal = offline/bukan Pro:
      // lanjutkan dengan data lokal seperti biasa.
      if (user && cloud && !demo) { try { await bootSync(cloud, user.id) } catch {} }
      if (cancelled) return
      const kelas = await db.kelas.where('is_aktif').equals(1).first() || await db.kelas.orderBy('id').first()
      if (cancelled) return
      useAppStore.setState({ kelasAktifId: kelas?.id ?? null })
      setShowSetup(!kelas)
      setChecking(false)
    })().catch(() => { if (!cancelled) { setCheckError(true); setChecking(false) } })
    return () => { cancelled = true }
  }, [authChecking, accountId, demo])

  if (checkError) return <div className="min-h-dvh grid place-items-center p-4"><div role="alert" className="max-w-md space-y-3 rounded-2xl border border-red-200 bg-white p-6"><h1 className="font-bold">Data kelas belum bisa dibuka</h1><p className="text-sm text-slate-600">Coba muat ulang halaman. Jangan hapus data situs karena data kelas tersimpan di browser ini.</p><button onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white">Coba lagi</button></div></div>
  if (authChecking) return <div role="status" className="min-h-dvh grid place-items-center text-sm text-slate-500">Memeriksa akun...</div>
  if (cloud && !user && !demo) return <Navigate to="/login" replace />
  if (checking) return <div role="status" className="min-h-dvh grid place-items-center text-sm text-slate-500">Menyiapkan aplikasi...</div>
  if (showSetup) return <SetupWizard userId={user?.id} onComplete={() => setShowSetup(false)} />
  return <>{children}</>
}

function SetupWizard({ userId, onComplete }: { userId?: string; onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState(initialSetup)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const saveLock = useRef(false)
  const setKelasAktif = useAppStore((s) => s.setKelasAktif)
  const update = (key: keyof SetupData, value: string | number) => setData((v) => ({ ...v, [key]: value }))
  const valid = step === 1 ? data.namaKelas && data.tingkat : step === 2 ? data.namaSekolah && data.namaWali : true

  const cloudUser = !!userId && !!userClient()
  const plan = useAuthStore((s) => s.plan)
  const loginEmail = useAuthStore((s) => s.user?.email || '')
  const [cloudOpen, setCloudOpen] = useState(false)
  const [email, setEmail] = useState('')
  // Tanggal data cloud akun ini (null = belum ada). Dipakai untuk hint "sudah dipakai di perangkat lain".
  const [cloudAt, setCloudAt] = useState<string | null>(null)
  const [cloudNote, setCloudNote] = useState<'' | 'kosong' | 'bukan-pro' | 'beda-akun'>('')
  useEffect(() => {
    const client = userClient(); if (!client || !userId) return
    void refreshPlan(client, userId).catch(() => {})
    remoteSnapshotAt(client, userId).then(setCloudAt, () => {})
  }, [userId])
  const openCloud = () => { setCloudOpen(true); setError(''); setCloudNote('') }
  // Satu tombol: cek dulu ada data atau tidak, lalu tarik bila akun Pro.
  const pullCloud = async () => {
    const client = userClient()
    if (!client || !userId || saveLock.current) return
    setError(''); setCloudNote('')
    const current = (loginEmail || (await client.auth.getUser()).data.user?.email || '').trim().toLowerCase()
    if (email.trim().toLowerCase() !== current) { setCloudNote('beda-akun'); return }
    saveLock.current = true; setSaving(true)
    try {
      const at = await remoteSnapshotAt(client, userId)
      setCloudAt(at)
      if (!at) { setCloudNote('kosong'); return }
      if (plan !== 'pro') { setCloudNote('bukan-pro'); return }
      activateMainDb()
      const ok = await pullSnapshot(client, userId, () => true)
      const kelas = ok ? await db.kelas.orderBy('id').first() : undefined
      if (!kelas?.id) { setCloudNote('kosong'); return }
      setKelasAktif(kelas.id); onComplete()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Data cloud belum bisa dicek. Periksa koneksi lalu coba lagi.')
    } finally { saveLock.current = false; setSaving(false) }
  }
  const navigate = useNavigate()
  const switchAccount = async () => {
    const client = userClient(); const target = email.trim()
    try { if (client) await signOutUser(client) } catch {}
    navigate(`/login?email=${encodeURIComponent(target)}`, { replace: true })
  }
  const cloudDate = cloudAt ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(cloudAt)) : ''
  const finish = async (skip = false) => {
    if (saveLock.current) return
    saveLock.current = true
    setSaving(true)
    setError('')
    try {
    if (skip) {
      // Data contoh selalu di database terpisah agar tidak tercampur dengan data akun.
      activateDemoDb()
      await seedDemoData()
      useAuthStore.getState().setDemo()
      setKelasAktif(1)
      onComplete()
      return
    }
    activateMainDb()
    const kelasId = await saveInitialClass(db, data, userId || 'local')
    setKelasAktif(kelasId)
    onComplete()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kelas belum berhasil disiapkan. Isian Anda tetap ada; silakan coba lagi.')
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  const labels = ['Kelas', 'Sekolah', 'Ringkasan']

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col items-center p-3 sm:p-4">
      <div className="compact my-auto w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-baseline justify-between gap-3"><h1 className="font-bold text-base sm:text-lg">Siapkan kelas pertama</h1><span className="shrink-0 text-xs font-semibold text-slate-500">Langkah {step}/3 · {labels[step - 1]}</span></div>
          <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>{[1, 2, 3].map(n => <span key={n} className={`h-1.5 rounded-full ${step >= n ? 'bg-teal-600' : 'bg-slate-200'}`} />)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {cloudUser && <button type="button" aria-expanded={cloudOpen} disabled={saving} onClick={() => cloudOpen ? setCloudOpen(false) : openCloud()} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${cloudOpen ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}><Cloud size={16}/>Ambil data cloud<span className="rounded-md bg-amber-100 px-1.5 text-[11px] font-black text-amber-800">PRO</span></button>}
            <button type="button" disabled={saving} onClick={() => finish(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Sparkles size={16} className="text-amber-600"/>{saving && !cloudOpen ? 'Menyiapkan…' : 'Isi data contoh'}</button>
          </div>
          {cloudAt && !cloudOpen && <button type="button" onClick={openCloud} className="mt-3 flex w-full items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-left text-sm text-teal-900 hover:bg-teal-100"><Cloud size={17} className="mt-0.5 shrink-0"/><span><strong>Akun ini sudah dipakai di perangkat lain.</strong> Data cloud terakhir {cloudDate}. Tarik datanya agar tidak mulai dari nol{plan === 'pro' ? '.' : ' (khusus Pro).'}</span></button>}
          {cloudOpen && <form onSubmit={(e) => { e.preventDefault(); void pullCloud() }} className="mt-3 rounded-xl bg-teal-50 p-3">
            <label className="block text-xs font-bold text-teal-900">Email akun Anda<input type="email" required autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setCloudNote('') }} placeholder="nama@email.com" className="field mt-1.5"/></label>
            <p className="mt-1.5 text-xs text-teal-800">Sedang login: <strong className="break-all">{loginEmail || '-'}</strong>. Kami cek apakah ada data kelas dari HP atau laptop lain. Bila ada dan akun Pro, data langsung disalin ke perangkat ini.</p>
            <button disabled={saving || !email.trim()} className="mt-2 min-h-11 w-full rounded-xl bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Memeriksa cloud…' : 'Cek & tarik data'}</button>
            {cloudNote === 'beda-akun' && <div role="status" className="mt-2 rounded-lg bg-white p-2.5 text-sm text-slate-700"><p>Perangkat ini sedang login sebagai <strong className="break-all">{loginEmail}</strong>. Data cloud milik <strong className="break-all">{email.trim()}</strong> hanya bisa ditarik setelah masuk dengan email itu.</p><button type="button" onClick={() => void switchAccount()} className="mt-2 min-h-11 w-full rounded-xl border border-teal-300 bg-teal-50 px-3 text-sm font-bold text-teal-900">Keluar & masuk dengan {email.trim()}</button></div>}
            {cloudNote === 'kosong' && <p role="status" className="mt-2 text-sm text-slate-700">Belum ada data cloud untuk email ini. Isi kelas pertama di bawah.</p>}
            {cloudNote === 'bukan-pro' && <p role="status" className="mt-2 flex items-start gap-2 text-sm text-amber-900"><Lock size={15} className="mt-0.5 shrink-0"/><span>Ada data cloud ({cloudDate}), tetapi menarik data khusus pelanggan Pro. <Link to="/aktivasi" className="font-bold underline">Aktifkan Pro</Link>, lalu coba lagi.</span></p>}
          </form>}
          {!cloudOpen && <p className="mt-2 text-xs text-slate-500">Data contoh terpisah dari data asli dan bisa dihapus nanti.</p>}
        </div>
        {error && <p role="alert" className="px-4 sm:px-5 pt-3 text-sm text-red-700">{error}</p>}
        <fieldset disabled={saving} className="min-w-0 px-4 py-4 sm:px-5">
          {step === 1 && <div className="grid grid-cols-2 gap-3">
            <Field label="Nama kelas" placeholder="Contoh: Kelas 2-A" value={data.namaKelas} onChange={(v) => update('namaKelas', v)} wide />
            <label className="text-sm font-semibold text-slate-700">Tingkat kelas<select value={data.tingkat} onChange={e => update('tingkat', e.target.value)} className="field mt-1.5">{[1,2,3,4,5,6].map(grade => <option key={grade} value={grade}>Kelas {grade}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Fase otomatis<input readOnly value={getPhaseForGrade(data.tingkat)} className="field mt-1.5"/></label>
            <Field label="Tahun ajaran" value={data.tahunAjaran} onChange={(v) => update('tahunAjaran', v)} />
            <label className="text-sm font-semibold text-slate-700">Semester<select value={data.semester} onChange={(e) => update('semester', Number(e.target.value))} className="field mt-1.5"><option value={1}>1 (Ganjil)</option><option value={2}>2 (Genap)</option></select></label>
          </div>}
          {step === 2 && <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nama sekolah" placeholder="Contoh: SD Negeri 1" value={data.namaSekolah} onChange={(v) => update('namaSekolah', v)} wide />
            <Field label="Nama wali kelas" placeholder="Nama lengkap dan gelar" value={data.namaWali} onChange={(v) => update('namaWali', v)} />
            <Field label="NIP (opsional)" placeholder="Nomor induk pegawai" value={data.nip} onChange={(v) => update('nip', v)} />
          </div>}
          {step === 3 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center"><Check size={18}/></div><h2 className="font-bold">Periksa sebelum mulai</h2></div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Summary label="Kelas" value={`${data.namaKelas} · Tingkat ${data.tingkat} (Fase ${getPhaseForGrade(data.tingkat)})`} />
              <Summary label="Periode" value={`${data.tahunAjaran} · Semester ${data.semester}`} />
              <Summary label="Sekolah" value={data.namaSekolah} />
              <Summary label="Wali kelas" value={`${data.namaWali}${data.nip ? ` · NIP ${data.nip}` : ''}`} />
            </div>
          </div>}
        </fieldset>
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex justify-between gap-3">
          <button disabled={step === 1 || saving} onClick={() => setStep((s) => s - 1)} className="min-h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40 flex items-center gap-2"><ArrowLeft size={16}/> Kembali</button>
          {step < 3 ? <button disabled={!valid || saving} onClick={() => setStep((s) => s + 1)} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2">Selanjutnya <ArrowRight size={16}/></button>
            : <button disabled={saving} onClick={() => finish()} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Buka Dashboard'}</button>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, wide }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean }) {
  return <label className={`text-sm font-semibold text-slate-700 ${wide ? 'col-span-full' : ''}`}>{label}<input required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field mt-1.5" /></label>
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white border border-slate-200 p-3"><div className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-1">{label}</div><div className="font-semibold text-slate-800">{value || '-'}</div></div>
}
