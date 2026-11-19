import { useEffect, useMemo, useState } from 'react'
import Modal from '../../../components/Modal'
import { KATROL_METHODS, katrolRows, katrolSummary, type KatrolMethod, type KatrolRow } from '../../../../shared/katrol'

type Col = { id: number; label: string }
type Student = { id: number; nama: string }

// Katrol nilai satu kolom. Hasil langsung tersimpan; halaman Penilaian menampilkan tombol Batalkan.
export default function KatrolDialog({ columns, students, nilaiMap, onApply, onClose }: {
  columns: Col[]
  students: Student[]
  nilaiMap: Record<string, number | null>
  onApply: (columnId: number, rows: KatrolRow[]) => Promise<void> | void
  onClose: () => void
}) {
  const filledCount = (id: number) => students.filter(s => typeof nilaiMap[`${s.id}-${id}`] === 'number').length
  const firstFilled = columns.find(c => filledCount(c.id) > 0)?.id ?? columns[0]?.id ?? 0
  const [columnId, setColumnId] = useState(firstFilled)
  const [method, setMethod] = useState<KatrolMethod>('kkm')
  const [showOther, setShowOther] = useState(false)
  const [busy, setBusy] = useState(false)
  const [poin, setPoin] = useState('5')
  const [kkm, setKkm] = useState('75')
  const [maxKatrol, setMaxKatrol] = useState('100')
  useEffect(() => { if (!columns.some(c => c.id === columnId)) setColumnId(firstFilled) }, [columns, columnId, firstFilled])

  const num = (v: string, fallback: number) => { const n = Number(v); return v.trim() !== '' && Number.isFinite(n) ? n : fallback }
  const params = { method, poin: Math.max(0, num(poin, 0)), kkm: Math.min(100, Math.max(0, num(kkm, 75))), maxKatrol: Math.min(100, Math.max(0, num(maxKatrol, 100))) }
  const rows = useMemo(
    () => katrolRows(students.map(s => ({ id: s.id, nama: s.nama, nilai: nilaiMap[`${s.id}-${columnId}`] })), params),
    [students, nilaiMap, columnId, method, poin, kkm, maxKatrol],
  )
  const sum = katrolSummary(rows, params.kkm)
  const columnLabel = columns.find(c => c.id === columnId)?.label || ''

  return <Modal title="Katrol Nilai" onClose={onClose} maxWidth="max-w-2xl" footer={<>
    <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Batal</button>
    <button type="button" disabled={!sum.berubah || busy} onClick={async () => { setBusy(true); try { await onApply(columnId, rows.filter(r => r.delta !== 0)) } finally { setBusy(false); onClose() } }} className="min-h-11 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Menyimpan…' : sum.berubah ? `Simpan katrol ${sum.berubah} siswa` : 'Tidak ada nilai yang berubah'}</button>
  </>}>
    <div className="space-y-4">
      <label className="block text-sm font-bold text-slate-700">Kolom nilai yang dikatrol
        <select value={columnId} onChange={e => setColumnId(Number(e.target.value))} className="field mt-1.5">{columns.map(c => <option key={c.id} value={c.id}>{c.label} ({filledCount(c.id)} nilai terisi)</option>)}</select>
      </label>
      <div>
        <div role="radiogroup" aria-label="Metode katrol" className="grid grid-cols-2 gap-2">
          {KATROL_METHODS.filter(m => showOther || m.value === 'kkm' || m.value === method).map(m => <button key={m.value} type="button" role="radio" aria-checked={method === m.value} onClick={() => setMethod(m.value)} className={`min-h-11 rounded-xl border p-2.5 text-left ${method === m.value ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block text-sm font-bold text-slate-800">{m.label}{m.value === 'kkm' && <span className="ml-1.5 rounded bg-teal-100 px-1.5 text-[11px] font-bold text-teal-800">Paling umum</span>}</span><span className="block text-xs text-slate-500">{m.hint}</span></button>)}
        </div>
        {!showOther && <button type="button" onClick={() => setShowOther(true)} className="mt-2 min-h-11 text-sm font-semibold text-teal-700 hover:underline">Metode lain (tambah poin, rumus akar, skala)</button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {method === 'tambah' && <label className="text-sm font-bold text-slate-700">Tambah berapa poin?<input type="number" min={0} max={50} inputMode="decimal" value={poin} onChange={e => setPoin(e.target.value)} className="field mt-1.5"/></label>}
        <label className="text-sm font-bold text-slate-700">KKM <span className="font-normal text-slate-400">(hanya untuk katrol ini)</span><input type="number" min={0} max={100} inputMode="decimal" value={kkm} onChange={e => setKkm(e.target.value)} className="field mt-1.5"/></label>
        <label className="text-sm font-bold text-slate-700">Batas atas nilai<input type="number" min={0} max={100} inputMode="decimal" value={maxKatrol} onChange={e => setMaxKatrol(e.target.value)} className="field mt-1.5"/></label>
      </div>
      {sum.jumlah === 0
        ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Kolom <strong>{columnLabel}</strong> belum punya nilai. Isi nilainya dulu, atau pilih kolom lain.</p>
        : <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-lg font-black text-slate-800">{sum.rataAsli} → <span className="text-emerald-700">{sum.rataKatrol}</span></div><div className="text-xs text-slate-500">Rata-rata</div></div>
            <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-lg font-black text-slate-800">{sum.tuntasAsli} → <span className="text-emerald-700">{sum.tuntasKatrol}</span></div><div className="text-xs text-slate-500">Tuntas (≥ KKM)</div></div>
            <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-lg font-black text-slate-800">{sum.berubah}<span className="text-sm font-bold text-slate-400">/{sum.jumlah}</span></div><div className="text-xs text-slate-500">Nilai berubah</div></div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr><th scope="col" className="px-3 py-2 text-left">Nama</th><th scope="col" className="px-2 py-2 text-right">Asli</th><th scope="col" className="px-2 py-2 text-right">Katrol</th><th scope="col" className="px-3 py-2 text-right">Selisih</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map(r => <tr key={r.id}><td className="px-3 py-1.5 font-semibold text-slate-700">{r.nama}</td><td className="px-2 py-1.5 text-right text-slate-500">{r.asli}</td><td className={`px-2 py-1.5 text-right font-bold ${r.katrol >= params.kkm ? 'text-emerald-700' : 'text-red-600'}`}>{r.katrol}</td><td className={`px-3 py-1.5 text-right text-xs font-bold ${r.delta > 0 ? 'text-emerald-700' : r.delta < 0 ? 'text-red-600' : 'text-slate-400'}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td></tr>)}</tbody></table>
          </div>
          <p className="text-xs text-slate-500">Nilai langsung tersimpan. Setelah itu muncul tombol <strong>Batalkan</strong> selama 10 detik bila ingin mengembalikan. Nilai kosong tidak diubah. Untuk nilai rapor, katrol kolom UTS/UAS atau harian; Nilai Akhir ikut berubah otomatis.</p>
        </>}
    </div>
  </Modal>
}
