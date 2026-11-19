import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayInfo, effectiveWeeks, monthSummary, jpPerWeek, prota, prosem } from '../src/shared/prota.ts'

test('hari efektif: libur dan KTS tidak efektif, hari pengganti efektif', () => {
  const ev = [
    { jenis: 'libur_nasional', judul: 'HUT RI', tanggal_mulai: '2026-08-17' },
    { jenis: 'kts', judul: 'KTS', tanggal_mulai: '2026-09-21', tanggal_selesai: '2026-09-25' },
    { jenis: 'pengganti', judul: 'Masuk Sabtu', tanggal_mulai: '2026-08-22' },
  ]
  assert.equal(dayInfo('2026-08-17', 5, ev).efektif, false)
  assert.equal(dayInfo('2026-08-17', 5, ev).ket, 'HUT RI')
  assert.equal(dayInfo('2026-09-22', 5, ev).efektif, false)
  assert.equal(dayInfo('2026-08-18', 5, ev).efektif, true)
  assert.equal(dayInfo('2026-08-22', 5, ev).efektif, true, 'Sabtu pengganti')
  assert.equal(dayInfo('2026-08-29', 5, ev).sekolah, false, 'Sabtu biasa bukan hari sekolah 5 hari')
  assert.equal(dayInfo('2026-08-29', 6, ev).sekolah, true)
})

test('minggu efektif: minggu dengan libur lebih dari separuh tidak efektif', () => {
  // Agustus 2026: 3–7, 10–14, 17–21 (17 libur), 24–28, 31 (masuk minggu Sep)
  const ev = [{ jenis: 'libur_sekolah', judul: 'Libur', tanggal_mulai: '2026-08-10', tanggal_selesai: '2026-08-12' }]
  const weeks = effectiveWeeks({ mulai: '2026-08-03', akhir: '2026-08-28', hariSekolah: 5 }, ev)
  assert.equal(weeks.length, 4)
  assert.deepEqual(weeks.map(w => w.efektif), [true, false, true, true])
  assert.deepEqual(weeks.map(w => w.no), [1, 2, 3, 4])
  const m = monthSummary(weeks)
  assert.equal(m.length, 1)
  assert.deepEqual([m[0].label, m[0].minggu, m[0].efektif, m[0].tidakEfektif, m[0].ket], ['Agustus 2026', 4, 3, 1, 'Libur'])
})

test('minggu mengikuti bulan dari hari tengahnya dan dibatasi periode', () => {
  const weeks = effectiveWeeks({ mulai: '2026-07-13', akhir: '2026-08-07', hariSekolah: 5 }, [])
  assert.deepEqual(monthSummary(weeks).map(r => [r.label, r.minggu]), [['Juli 2026', 3], ['Agustus 2026', 1]])
  assert.deepEqual(effectiveWeeks({ mulai: '2026-08-10', akhir: '2026-08-01', hariSekolah: 5 }, []), [])
})

test('Prota dan Prosem dari JP jadwal', () => {
  const jp = jpPerWeek([{ mata_pelajaran_id: 1 }, { mata_pelajaran_id: 1 }, { mata_pelajaran_id: 2 }, { mata_pelajaran_id: null }])
  assert.deepEqual(jp, { 1: 2, 2: 1 })
  const s1 = effectiveWeeks({ mulai: '2026-08-03', akhir: '2026-08-28', hariSekolah: 5 }, [])
  const s2 = effectiveWeeks({ mulai: '2027-01-04', akhir: '2027-01-15', hariSekolah: 5 }, [])
  const rows = prota([{ id: 1, nama: 'Matematika' }, { id: 3, nama: 'Seni' }], jp, s1, s2)
  assert.deepEqual(rows[0], { mapelId: 1, nama: 'Matematika', jp: 2, mingguS1: 4, mingguS2: 2, jpS1: 8, jpS2: 4, total: 12 })
  assert.equal(rows[1].total, 0, 'mapel tanpa jadwal = 0 JP')
  const ps = prosem([{ id: 1, nama: 'Matematika' }], jp, monthSummary(s1))
  assert.deepEqual(ps[0].perBulan, [8])
  assert.equal(ps[0].total, 8)
})
