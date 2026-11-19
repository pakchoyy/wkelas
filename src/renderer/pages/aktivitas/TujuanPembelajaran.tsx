import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, Target } from 'lucide-react'
import { db } from '../../../lib/db'
import { useAppStore } from '../../stores/appStore'
import GradeOptions from '../../components/GradeOptions'
import { ERAPOR_MAX, TP_SOURCES, lengthStatus, mapelOptions, matchMapel, tpList, type TpBank } from '../../../shared/tp-bank'

// Bank TP (tanpa AI) dari alat Draft TP BGY. Data diunduh hanya saat halaman ini dibuka.
let bankCache: Promise<TpBank> | null = null
const loadBank = () => (bankCache ??= fetch('/data/tp-bank.json').then(r => { if (!r.ok) throw new Error(); return r.json() }).catch(e => { bankCache = null; throw e }))

export default function TujuanPembelajaran() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <TpKelas key={kelasId} kelasId={kelasId}/>
}

function TpKelas({ kelasId }: { kelasId: number }) {
  const [bank, setBank] = useState<TpBank | null>(null)
  const [error, setError] = useState('')
  const [cp, setCp] = useState<string>('cp2025')
  const [kelas, setKelas] = useState(1)
  const [sem, setSem] = useState(1)
  const [mapel, setMapel] = useState('')
  const [wkelasMapel, setWkelasMapel] = useState<string[]>([])
  const [items, setItems] = useState<{ text: string; on: boolean }[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [k, mapelRaw, b] = await Promise.all([db.kelas.get(kelasId), window.electronAPI.mapel.list(kelasId), loadBank()])
      if (cancelled) return
      const t = Number(k?.tingkat); setKelas(t >= 1 && t <= 12 ? t : 1)
      setSem(k?.semester === 2 ? 2 : 1)
      setWkelasMapel((mapelRaw as any[]).filter(m => m.is_aktif !== 0).map(m => String(m.nama)))
      setBank(b)
    })().catch(() => { if (!cancelled) setError('Bank TP belum bisa dimuat. Periksa koneksi lalu muat ulang halaman.') })
    return () => { cancelled = true }
  }, [kelasId])

  const options = useMemo(() => mapelOptions(bank, cp, kelas, sem), [bank, cp, kelas, sem])
  // Mapel yang juga ada di Wkelas ditampilkan dulu.
  const ordered = useMemo(() => {
    const matched = new Set(wkelasMapel.map(m => matchMapel(options, m)).filter(Boolean) as string[])
    return [...options.filter(o => matched.has(o)), ...options.filter(o => !matched.has(o))].map(o => ({ value: o, mine: matched.has(o) }))
  }, [options, wkelasMapel])
  useEffect(() => { if (!options.includes(mapel)) setMapel(ordered[0]?.value || '') }, [options, ordered, mapel])
  useEffect(() => { setItems(tpList(bank, cp, kelas, sem, mapel).map(text => ({ text, on: true }))); setCopied(false) }, [bank, cp, kelas, sem, mapel])

  const chosen = items.filter(i => i.on && i.text.trim())
  const tooLong = items.filter(i => i.on && lengthStatus(i.text) === 'panjang').length
  const copy = async () => {
    try { await navigator.clipboard.writeText(chosen.map(i => i.text.trim()).join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* izin clipboard ditolak */ }
  }
  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const src = TP_SOURCES.find(s => s.value === cp)
    const rows = [['Tujuan Pembelajaran'], [`${mapel} · Kelas ${kelas} · Semester ${sem}`], [src?.detail || ''], [], ['No', 'Tujuan Pembelajaran', 'Jumlah karakter'], ...chosen.map((i, n) => [n + 1, i.text.trim(), i.text.trim().length])]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'TP')
    XLSX.writeFile(wb, `TP-${mapel.replace(/[^\w]+/g, '-')}-Kelas${kelas}-Sem${sem}.xlsx`)
  }

  const seg = (active: boolean) => `min-h-11 rounded-lg px-3 text-sm font-bold ${active ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`

  return <div className="mx-auto max-w-4xl space-y-4 pb-16">
    <div><div className="flex items-center gap-2"><Target size={21} className="text-teal-700"/><h1 className="text-xl font-extrabold text-slate-900">Tujuan Pembelajaran</h1></div>
      <p className="mt-1 text-sm text-slate-500">TP siap pakai dari Capaian Pembelajaran, maksimal {ERAPOR_MAX} karakter agar muat di e-Rapor. Pilih, sunting bila perlu, lalu salin atau unduh.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!bank && !error && <p role="status" className="text-sm text-slate-500">Memuat bank TP…</p>}
    {bank && <>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">{TP_SOURCES.map(s => <button key={s.value} type="button" aria-pressed={cp === s.value} onClick={() => setCp(s.value)} className={seg(cp === s.value)}>{s.label}</button>)}</div>
          <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">{[1, 2].map(s => <button key={s} type="button" aria-pressed={sem === s} onClick={() => setSem(s)} className={seg(sem === s)}>Sem {s}</button>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
          <label className="text-sm font-bold text-slate-700">Kelas<select value={kelas} onChange={e => setKelas(Number(e.target.value))} className="field mt-1.5"><GradeOptions/></select></label>
          <label className="text-sm font-bold text-slate-700">Mata pelajaran<select value={mapel} onChange={e => setMapel(e.target.value)} className="field mt-1.5">{ordered.map(o => <option key={o.value} value={o.value}>{o.value}{o.mine ? ' (ada di kelas Anda)' : ''}</option>)}</select></label>
        </div>
        <p className="text-xs text-slate-500">Sumber: {TP_SOURCES.find(s => s.value === cp)?.detail}.</p>
      </section>

      {cp === 'cp2026' && items.some(i => lengthStatus(i.text) === 'panjang') && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Sebagian rumusan Pendidikan Agama masih berupa uraian CP yang panjang. Butir bertanda <strong>perlu diringkas</strong> lebih dari {ERAPOR_MAX} karakter; sunting dulu sebelum dipakai di e-Rapor.</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-700">{chosen.length} dari {items.length} TP dipilih{tooLong ? <span className="ml-2 font-semibold text-amber-700">· {tooLong} perlu diringkas</span> : null}</p>
          <div className="flex gap-2">
            <button type="button" disabled={!chosen.length} onClick={() => void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">{copied ? <><Check size={16} className="text-emerald-600"/>Tersalin</> : <><Copy size={16}/>Salin</>}</button>
            <button type="button" disabled={!chosen.length} onClick={() => void exportExcel()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-40"><Download size={16}/>Excel</button>
          </div>
        </div>
        {!items.length ? <p className="p-6 text-center text-sm text-slate-500">Belum ada TP untuk pilihan ini.</p>
          : <ol className="divide-y divide-slate-100">{items.map((it, i) => {
            const len = it.text.trim().length, long = len > ERAPOR_MAX
            return <li key={i} className="flex gap-3 px-4 py-3">
              <input type="checkbox" checked={it.on} onChange={e => setItems(list => list.map((x, j) => j === i ? { ...x, on: e.target.checked } : x))} aria-label={`Pilih TP ${i + 1}`} className="mt-2 size-5 shrink-0 accent-teal-700"/>
              <div className="min-w-0 flex-1">
                <textarea value={it.text} onChange={e => setItems(list => list.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} rows={Math.min(5, Math.max(2, Math.ceil(len / 42)))} aria-label={`Tujuan pembelajaran ${i + 1}`} className={`w-full resize-y rounded-lg border px-2.5 py-1.5 text-sm leading-6 text-slate-800 ${long ? 'border-amber-300 bg-amber-50/50' : 'border-transparent bg-transparent hover:border-slate-200 focus:border-teal-500 focus:bg-white'}`}/>
                <p className={`mt-0.5 text-xs ${long ? 'font-bold text-amber-700' : 'text-slate-400'}`}>{len}/{ERAPOR_MAX} karakter{long ? ' · perlu diringkas' : ''}</p>
              </div>
            </li>
          })}</ol>}
      </section>
    </>}
  </div>
}
