import { useState, useEffect } from 'react'
import { Upload, Trash2, FileText, Download, BookOpen } from 'lucide-react'

const JENIS_DOKUMEN = ['CP', 'ATP', 'Prota', 'Promes', 'RPM', 'Modul Ajar']

export default function PerangkatAjar() {
  const [tab, setTab] = useState<'resmi' | 'saya'>('resmi')
  const [dokSaya, setDokSaya] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ judul: '', deskripsi: '', kategori: '' })

  const loadDokSaya = async () => setDokSaya(await window.electronAPI.dokumenSaya.list())
  useEffect(() => { loadDokSaya() }, [])

  // Mock dokumen resmi — Supabase belum aktif
  const mockResmi = JENIS_DOKUMEN.map((j) => ({ jenis: j, judul: `Dokumen ${j}`, tersedia: false }))

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await window.electronAPI.dokumenSaya.upload({
      judul: form.judul,
      deskripsi: form.deskripsi,
      kategori: form.kategori,
    })
    if (result) {
      setShowForm(false)
      setForm({ judul: '', deskripsi: '', kategori: '' })
      loadDokSaya()
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Perangkat Ajar</h2>

      <div className="flex gap-1 mb-4 rounded-xl p-1" style={{ background: '#f1f5f9' }}>
        <button onClick={() => setTab('resmi')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'resmi' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
          Dokumen Resmi
        </button>
        <button onClick={() => setTab('saya')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'saya' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
          Dokumen Saya
        </button>
      </div>

      {tab === 'resmi' && (
        <div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-light)' }}>
            Dokumen resmi dari Admin BGY. Unduh untuk akses offline.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockResmi.map((d) => (
              <div key={d.jenis} className="rounded-xl p-4" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0ea5a0]/10 flex items-center justify-center">
                    <BookOpen size={18} className="text-[#0ea5a0]" />
                  </div>
                  {d.tersedia ? <Download size={16} className="text-[#0ea5a0]" /> : <span className="text-xs text-gray-400">Segera</span>}
                </div>
                <h3 className="text-sm font-semibold mb-1">{d.judul}</h3>
                <p className="text-xs" style={{ color: 'var(--text-light)' }}>{d.jenis}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'saya' && (
        <div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white mb-4" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
            <Upload size={16} /> Upload Dokumen
          </button>

          <div className="space-y-3">
            {dokSaya.map((d) => (
              <div key={d.id} className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText size={18} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{d.judul}</div>
                  <div className="text-xs text-gray-400">{d.format_file?.toUpperCase()} {d.kategori && `· ${d.kategori}`}</div>
                </div>
                <button onClick={async () => { if (confirm('Hapus?')) { await window.electronAPI.dokumenSaya.delete(d.id); loadDokSaya() } }} className="p-1 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {dokSaya.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada dokumen</p>}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">Upload Dokumen</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleUpload} className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Judul</label><input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Kategori</label><input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Modul, Soal, dll." className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Deskripsi</label><textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
                <button type="submit" className="rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
