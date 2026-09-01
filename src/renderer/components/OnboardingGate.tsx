import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, GraduationCap, School, ShieldCheck, X } from 'lucide-react'
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
  const setKelasAktif = useAppStore((s) => s.setKelasAktif)

  useEffect(() => {
    ;(async () => {
      const kelas = await db.kelas.where('is_aktif').equals(1).first() || await db.kelas.orderBy('id').first()
      if (kelas?.id) setKelasAktif(kelas.id)
      setShowSetup(!kelas)
      setChecking(false)
    })()
  }, [setKelasAktif])

  if (checking) return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Menyiapkan aplikasi...</div>
  if (showSetup) return <SetupWizard onComplete={() => setShowSetup(false)} />
  return <>{children}</>
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const setKelasAktif = useAppStore((s) => s.setKelasAktif)
  const update = (key: keyof SetupData, value: string | number) => setData((v) => ({ ...v, [key]: value }))
  const valid = step === 1 ? data.namaKelas && data.tingkat : step === 2 ? data.namaSekolah && data.namaWali : true

  const finish = async () => {
    setSaving(true)
    const timestamp = now()
    const guruId = await db.guru.add({
      supabase_uid: 'local', nama: data.namaWali, email: 'admin@lokal', nip: data.nip,
      nama_sekolah: data.namaSekolah, tahun_ajaran_aktif: data.tahunAjaran,
      semester_aktif: data.semester, created_at: timestamp, updated_at: timestamp,
    })
    const kelasId = await db.kelas.add({
      nama_kelas: data.namaKelas, tingkat: data.tingkat, tahun_ajaran: data.tahunAjaran,
      semester: data.semester, is_aktif: 1, guru_id: guruId, created_at: timestamp, updated_at: timestamp,
    })
    await db.mata_pelajaran.bulkAdd(getRecommendedMapel(data.tingkat).map((mapel, index) => ({ kelas_id: kelasId, nama: mapel.nama, kode: mapel.kode, urutan: index + 1, created_at: timestamp })))
    await db.pengaturan.bulkPut([
      { key: 'fase_aktif', value: data.fase, updated_at: timestamp },
      { key: 'onboarding_complete', value: 'true', updated_at: timestamp },
    ])
    setKelasAktif(kelasId)
    setSaving(false)
    onComplete()
  }

  const steps = [
    { n: 1, label: 'Kelas & Akademik', icon: GraduationCap },
    { n: 2, label: 'Sekolah & Wali Kelas', icon: School },
    { n: 3, label: 'Ringkasan', icon: ShieldCheck },
  ]

  return (
    <div className="min-h-screen bg-slate-100 grid place-items-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-7 py-5 border-b border-slate-100 flex justify-between">
          <div><h1 className="font-bold text-lg">Siapkan Kelas Pertama</h1><p className="text-sm text-slate-500">Langkah {step} dari 3 · data tersimpan hanya di perangkat ini</p></div>
          <X className="text-slate-300" size={22} />
        </div>
        <div className="px-7 py-4 border-b border-slate-100 flex items-center gap-3">
          {steps.map((item, i) => <div key={item.n} className="contents">
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= item.n ? 'text-emerald-700' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full grid place-items-center border ${step >= item.n ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300'}`}>{step > item.n ? <Check size={13}/> : item.n}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </div>{i < 2 && <div className="h-px bg-slate-200 flex-1" />}
          </div>)}
        </div>
        <div className="p-7 min-h-[340px]">
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
        </div>
        <div className="px-7 py-5 border-t border-slate-100 flex justify-between">
          <button disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-0 flex items-center gap-2"><ArrowLeft size={16}/> Kembali</button>
          {step < 3 ? <button disabled={!valid} onClick={() => setStep((s) => s + 1)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2">Selanjutnya <ArrowRight size={16}/></button>
            : <button disabled={saving} onClick={finish} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Buka Dashboard'}</button>}
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
