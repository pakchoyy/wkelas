import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, GraduationCap, School, ShieldCheck } from 'lucide-react'
import { db } from '../../lib/db'
import { useAppStore } from '../stores/appStore'
import { getRecommendedMapel } from '../../shared/mapelRecommendations'

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

type SetupData = {
  namaKelas: string; tingkat: string; tahunAjaran: string; semester: number
  namaSekolah: string; namaWali: string; nip: string; fase: string
}

const initialData: SetupData = {
  namaKelas: '', tingkat: '', tahunAjaran: '2026/2027', semester: 1,
  namaSekolah: '', namaWali: '', nip: '', fase: '',
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [checkError, setCheckError] = useState(false)
  const setKelasAktif = useAppStore((s) => s.setKelasAktif)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const kelas = await db.kelas.where('is_aktif').equals(1).first() || await db.kelas.orderBy('id').first()
      if (cancelled) return
      if (kelas?.id) setKelasAktif(kelas.id)
      setShowSetup(!kelas)
      setChecking(false)
    })().catch(() => { if (!cancelled) { setCheckError(true); setChecking(false) } })
    return () => { cancelled = true }
  }, [setKelasAktif])

  if (checkError) return <div className="min-h-dvh grid place-items-center p-4"><div role="alert" className="max-w-md space-y-3 rounded-2xl border border-red-200 bg-white p-6"><h1 className="font-bold">Data kelas belum bisa dibuka</h1><p className="text-sm text-slate-600">Coba muat ulang halaman. Jangan hapus data situs karena data kelas tersimpan di browser ini.</p><button onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">Coba lagi</button></div></div>
  if (checking) return <div role="status" className="min-h-dvh grid place-items-center text-sm text-slate-500">Menyiapkan aplikasi...</div>
  if (showSetup) return <SetupWizard onComplete={() => setShowSetup(false)} />
  return <>{children}</>
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const saveLock = useRef(false)
  const setKelasAktif = useAppStore((s) => s.setKelasAktif)
  const update = (key: keyof SetupData, value: string | number) => setData((v) => ({ ...v, [key]: value }))
  const valid = step === 1 ? data.namaKelas && data.tingkat : step === 2 ? data.namaSekolah && data.namaWali : true

  const finish = async (skip = false) => {
    if (saveLock.current) return
    saveLock.current = true
    setSaving(true)
    setError('')
    const setup = skip ? { ...data, namaKelas: data.namaKelas.trim() || 'Kelas Saya', tingkat: data.tingkat.trim() || '1', namaWali: data.namaWali.trim() || 'Wali Kelas' } : data
    try {
    const timestamp = now()
    const kelasId = await db.transaction('rw', [db.guru, db.kelas, db.mata_pelajaran, db.pengaturan], async () => {
    const guruId = await db.guru.add({
      supabase_uid: 'local', nama: setup.namaWali, email: 'admin@lokal', nip: setup.nip,
      nama_sekolah: setup.namaSekolah, tahun_ajaran_aktif: setup.tahunAjaran,
      semester_aktif: setup.semester, created_at: timestamp, updated_at: timestamp,
    })
    const kelasId = await db.kelas.add({
      nama_kelas: setup.namaKelas, tingkat: setup.tingkat, tahun_ajaran: setup.tahunAjaran,
      semester: setup.semester, is_aktif: 1, guru_id: guruId, created_at: timestamp, updated_at: timestamp,
    })
    if (!skip) await db.mata_pelajaran.bulkAdd(getRecommendedMapel(setup.tingkat).map((mapel, index) => ({ kelas_id: kelasId, nama: mapel.nama, kode: mapel.kode, urutan: index + 1, created_at: timestamp })))
    await db.pengaturan.bulkPut([
      { key: 'fase_aktif', value: data.fase, updated_at: timestamp },
      { key: 'onboarding_complete', value: 'true', updated_at: timestamp },
    ])
    return kelasId
    })
    setKelasAktif(kelasId)
    onComplete()
    } catch {
      setError('Kelas belum berhasil disiapkan. Isian Anda tetap ada; silakan coba lagi.')
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  const steps = [
    { n: 1, label: 'Kelas & Akademik', icon: GraduationCap },
    { n: 2, label: 'Sekolah & Wali Kelas', icon: School },
    { n: 3, label: 'Ringkasan', icon: ShieldCheck },
  ]

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col items-center p-3 sm:p-4">
      <div className="my-auto w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="px-4 sm:px-7 py-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="font-bold text-lg">Siapkan Kelas Pertama</h1><p className="text-sm text-slate-500">Langkah {step} dari 3 · data tersimpan hanya di perangkat ini</p></div>
          <button type="button" disabled={saving} onClick={() => finish(true)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Lewati dulu</button>
        </div>
        <p className="px-4 sm:px-7 pt-4 text-sm text-slate-500">Lewati untuk mencoba dengan Kelas Saya (tingkat awal 1). Identitas dan tingkat kelas bisa dilengkapi di Pengaturan; mapel ditambahkan nanti.</p>
        {error && <p role="alert" className="px-4 sm:px-7 pt-3 text-sm text-red-700">{error}</p>}
        <div className="px-7 py-4 border-b border-slate-100 flex items-center gap-3">
          {steps.map((item, i) => <div key={item.n} className="contents">
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= item.n ? 'text-emerald-700' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full grid place-items-center border ${step >= item.n ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300'}`}>{step > item.n ? <Check size={13}/> : item.n}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </div>{i < 2 && <div className="h-px bg-slate-200 flex-1" />}
          </div>)}
        </div>
        <fieldset disabled={saving} className="min-w-0 p-4 sm:p-7 sm:min-h-[340px]">
          {step === 1 && <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Nama kelas" placeholder="Contoh: VII-A" value={data.namaKelas} onChange={(v) => update('namaKelas', v)} wide />
            <Field label="Tingkat kelas" placeholder="Contoh: 7" value={data.tingkat} onChange={(v) => update('tingkat', v)} />
            <Field label="Fase" placeholder="Contoh: D" value={data.fase} onChange={(v) => update('fase', v)} />
            <Field label="Tahun ajaran" value={data.tahunAjaran} onChange={(v) => update('tahunAjaran', v)} />
            <label className="text-sm font-semibold text-slate-700">Semester<select value={data.semester} onChange={(e) => update('semester', Number(e.target.value))} className="field mt-2"><option value={1}>1 (Ganjil)</option><option value={2}>2 (Genap)</option></select></label>
          </div>}
          {step === 2 && <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Nama sekolah" placeholder="Contoh: SMP Negeri 1" value={data.namaSekolah} onChange={(v) => update('namaSekolah', v)} wide />
            <Field label="Nama wali kelas" placeholder="Nama lengkap dan gelar" value={data.namaWali} onChange={(v) => update('namaWali', v)} />
            <Field label="NIP (opsional)" placeholder="Nomor induk pegawai" value={data.nip} onChange={(v) => update('nip', v)} />
          </div>}
          {step === 3 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center"><Check size={20}/></div><div><h2 className="font-bold">Data siap digunakan</h2><p className="text-sm text-slate-500">Periksa ringkasan sebelum membuka dashboard.</p></div></div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Summary label="Kelas" value={`${data.namaKelas} · Tingkat ${data.tingkat}${data.fase ? ` (Fase ${data.fase})` : ''}`} />
              <Summary label="Periode" value={`${data.tahunAjaran} · Semester ${data.semester}`} />
              <Summary label="Sekolah" value={data.namaSekolah} />
              <Summary label="Wali kelas" value={`${data.namaWali}${data.nip ? ` · NIP ${data.nip}` : ''}`} />
            </div>
          </div>}
        </fieldset>
        <div className="px-4 sm:px-7 py-5 border-t border-slate-100 flex flex-wrap justify-between gap-3">
          <button disabled={step === 1 || saving} onClick={() => setStep((s) => s - 1)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40 flex items-center gap-2"><ArrowLeft size={16}/> Kembali</button>
          {step < 3 ? <button disabled={!valid || saving} onClick={() => setStep((s) => s + 1)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2">Selanjutnya <ArrowRight size={16}/></button>
            : <button disabled={saving} onClick={() => finish()} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Buka Dashboard'}</button>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, wide }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean }) {
  return <label className={`text-sm font-semibold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<input required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field mt-2" /></label>
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white border border-slate-200 p-4"><div className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-1">{label}</div><div className="font-semibold text-slate-800">{value || '-'}</div></div>
}
