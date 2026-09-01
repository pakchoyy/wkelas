import { useState } from 'react'
import { User, BookOpen, ShieldCheck, RefreshCw, Database, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'

type TabPengaturan = 'profil' | 'tahun-ajaran' | 'backup'

export default function Pengaturan() {
  const [tab, setTab] = useState<TabPengaturan>('profil')

  const tabs = [
    { id: 'profil' as const, icon: User, label: 'Sekolah & Guru' },
    { id: 'tahun-ajaran' as const, icon: BookOpen, label: 'Kelas & Semester' },
    { id: 'backup' as const, icon: Database, label: 'Data & Cadangan' },
  ]

  return (
    <div>
      <div className="mb-4"><h2 className="text-xl font-bold">Pengaturan</h2><p className="mt-1 text-sm text-slate-500">Kelola identitas sekolah, periode kelas, dan keamanan data.</p></div>

      <div className="flex gap-1 mb-4 rounded-xl p-1 overflow-x-auto" style={{ background: '#f1f5f9' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${tab === t.id ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        {tab === 'profil' && <ProfilTab />}
        {tab === 'tahun-ajaran' && <TahunAjaranTab />}
        {tab === 'backup' && <BackupTab />}
      </div>
    </div>
  )
}

function ProfilTab() {
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-sm font-bold">Profil Guru</h3>
      <p className="text-xs text-gray-400">Edit profil — data tersimpan di SQLite lokal.</p>
      {['Nama', 'NIP', 'Sekolah', 'Mata Pelajaran'].map((label) => (
        <div key={label}>
          <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
          <input className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} placeholder={label} />
        </div>
      ))}
      <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
    </div>
  )
}

function TahunAjaranTab() {
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-sm font-bold">Tahun Ajaran</h3>
      <div><label className="text-xs font-medium text-gray-700 block mb-1">Tahun Ajaran</label>
        <select className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
          <option>2025/2026</option>
          <option>2026/2027</option>
        </select></div>
      <div><label className="text-xs font-medium text-gray-700 block mb-1">Semester</label>
        <select className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
          <option value={1}>Ganjil</option>
          <option value={2}>Genap</option>
        </select></div>
      <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
    </div>
  )
}

function BackupTab() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleBackup = async () => {
    setMsg(null)
    const res = await window.electronAPI.backup.create()
    if (res.success) setMsg({ ok: true, text: `Backup tersimpan: ${res.path}` })
    else setMsg({ ok: false, text: 'Backup dibatalkan' })
  }

  const handleRestore = async () => {
    setMsg(null)
    if (!confirm('Restore akan menimpa semua data saat ini. Lanjutkan?')) return
    const res = await window.electronAPI.backup.restore()
    if (res.success) { setMsg({ ok: true, text: 'Restore berhasil. Reload aplikasi...' }); setTimeout(() => window.location.reload(), 1500) }
    else setMsg({ ok: false, text: res.error || 'Restore dibatalkan' })
  }

  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-sm font-bold">Backup & Restore</h3>
      <p className="text-xs text-gray-400">Backup seluruh data ke file .bgy terenkripsi.</p>
      <div className="flex gap-3">
        <button onClick={handleBackup} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
          <Download size={16} /> Buat Backup
        </button>
        <button onClick={handleRestore} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>
          <Upload size={16} /> Restore
        </button>
      </div>
      {msg && (
        <div className={`flex items-center gap-2 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.text}
        </div>
      )}
    </div>
  )
}

function LisensiTab() {
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-sm font-bold">Lisensi</h3>
      <div className="rounded-lg p-3 bg-green-50 border border-green-200 text-sm text-green-800">
        Status: Aktif
      </div>
      <div><label className="text-xs font-medium text-gray-700 block mb-1">Kode Lisensi</label>
        <input className="w-full rounded-lg px-3 py-2 text-sm border font-mono" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} placeholder="Masukkan kode lisensi" /></div>
      <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Aktifkan</button>
    </div>
  )
}

function VersiTab() {
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-sm font-bold">Versi & Update</h3>
      <div className="text-sm">Versi saat ini: <strong>1.0.0</strong></div>
      <p className="text-xs text-gray-400">Aplikasi Anda sudah yang terbaru.</p>
    </div>
  )
}
