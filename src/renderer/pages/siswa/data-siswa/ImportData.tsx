import { useRef, useState } from 'react'
import { FileDown, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Modal from '../../../components/Modal'
import type { SiswaFieldDefinition } from '../../../../shared/types'
import {
  downloadTemplate,
  importSiswaXLSX,
  importSiswaCSV,
  type ImportResult,
} from '../../../lib/spreadsheet'

interface Props {
  fields: SiswaFieldDefinition[]
  kelasId: number
  onClose: () => void
  onImported: (result: ImportResult) => void
}

export default function ImportData({ fields, kelasId, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const handleDownloadTemplate = async () => {
    setError('')
    try {
      await downloadTemplate(fields)
    } catch {
      setError('Gagal membuat template.')
    }
  }

  const handlePickFile = () => {
    fileRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setImporting(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer()
        setResult(await importSiswaXLSX(buffer, fields, kelasId))
      } else if (ext === 'csv') {
        const text = await file.text()
        setResult(await importSiswaCSV(text, fields, kelasId))
      } else {
        setError('Format tidak didukung. Gunakan file Excel (.xlsx) atau CSV.')
      }
    } catch {
      setError('Gagal membaca file. Pastikan file Excel tidak rusak.')
    } finally {
      setImporting(false)
    }
  }

  const handleDone = () => {
    if (result) onImported(result)
    onClose()
  }

  return (
    <Modal title="Import Data Siswa" onClose={onClose} maxWidth="max-w-sm">
      {!result ? (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-light)' }}>
            Download template Excel, isi data siswa, lalu upload kembali.
          </p>

          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center gap-3 rounded-xl p-4 border text-left transition-all duration-200 hover:shadow-md active:scale-[0.99]"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
              <FileDown size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold">Download Template</div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>template-import-siswa.xlsx</div>
            </div>
          </button>

          <button
            onClick={handlePickFile}
            disabled={importing}
            className="w-full flex items-center gap-3 rounded-xl p-4 border text-left transition-all duration-200 hover:shadow-md active:scale-[0.99] disabled:opacity-60"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5' }}>
              {importing ? <Loader2 size={18} className="animate-spin text-green-600" /> : <Upload size={18} className="text-green-600" />}
            </div>
            <div>
              <div className="text-sm font-semibold">Upload Data</div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>Pilih file Excel (.xlsx) yang sudah diisi</div>
            </div>
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {result.ok > 0 ? (
              <CheckCircle2 size={28} className="text-green-600" />
            ) : (
              <AlertCircle size={28} className="text-red-500" />
            )}
            <div>
              <div className="text-sm font-bold">
                {result.ok > 0 ? `${result.ok} siswa berhasil diimpor` : 'Tidak ada yang diimpor'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                Total {result.total} baris · {result.gagal} gagal
              </div>
            </div>
          </div>
          {result.pesan.map((p, i) => (
            <div key={i} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {p}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={() => setResult(null)} className="rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>
            Import Lagi
          </button>
          <button onClick={handleDone} className="rounded-xl px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700">
            Selesai
          </button>
        </div>
      )}
    </Modal>
  )
}
