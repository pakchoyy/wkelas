import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesReportPeriod, reportTable } from '../src/shared/report-data.ts'
import { compareJournalRows } from '../src/shared/journal-report.ts'

test('calendar includes overlapping events and inclusive boundaries', () => {
  const event = { tanggal_mulai: '2026-08-30', tanggal_selesai: '2026-09-03' }
  assert.equal(matchesReportPeriod(event, 'kalender', '2026-09-01', '2026-09-30'), true)
  assert.equal(matchesReportPeriod(event, 'kalender', '2026-09-03', '2026-09-03'), true)
  assert.equal(matchesReportPeriod(event, 'kalender', '2026-09-04', ''), false)
  assert.equal(matchesReportPeriod(event, 'kalender', '', '2026-08-29'), false)
  assert.equal(matchesReportPeriod({ tanggal_mulai: '2026-09-02' }, 'kalender', '2026-09-02', '2026-09-02'), true)
})
test('daily reports filter by date; grades use their own active period', () => {
  assert.equal(matchesReportPeriod({ tanggal: '2026-08-31' }, 'jurnal', '2026-09-01', ''), false)
  assert.equal(matchesReportPeriod({}, 'nilai', '2026-09-01', '2026-09-30'), true)
})
test('export keeps human headers and zero, excludes internal identifiers', () => {
  const rows = reportTable('presensi', [{ id: 99, siswa_nama: 'Siswa Uji', hadir: 0, created_at: 'internal' }])
  assert.equal(rows[0][0], 'Nama Siswa')
  assert.equal(rows[1][1], 0)
  assert.equal(rows[1][2], '—')
  assert.equal(JSON.stringify(rows).includes('internal'), false)
  assert.equal(rows[1].includes(99), false)
  const calendar = reportTable('kalender', [{ tanggal_mulai: '2026-09-02', jumlah_hari: 1 }])
  assert.equal(calendar[1][1], '2026-09-02')
})
test('report journals sort lesson numbers, not text order', () => {
  const rows = ['10','2','1','3–4'].map(jam_ke => ({ tanggal: '2026-09-02', jam_ke })).sort(compareJournalRows)
  assert.deepEqual(rows.map(row => row.jam_ke), ['1','2','3–4','10'])
})
