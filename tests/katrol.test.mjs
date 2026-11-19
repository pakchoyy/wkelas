import { test } from 'node:test'
import assert from 'node:assert/strict'
import { katrolScore, katrolRows, katrolSummary } from '../src/shared/katrol.ts'

const base = { poin: 5, kkm: 75, maxKatrol: 100 }

test('empat metode katrol sama dengan alat Katrol Nilai BGY', () => {
  assert.equal(katrolScore(70, { ...base, method: 'tambah' }, 90), 75)
  assert.equal(katrolScore(70, { ...base, method: 'kkm' }, 90), 75)
  assert.equal(katrolScore(80, { ...base, method: 'kkm' }, 90), 80, 'yang sudah tuntas tidak berubah')
  assert.equal(katrolScore(64, { ...base, method: 'akar' }, 90), 80)
  assert.equal(katrolScore(45, { ...base, method: 'skala' }, 90), 50)
})

test('batas atas dan bawah dihormati', () => {
  assert.equal(katrolScore(98, { ...base, method: 'tambah', poin: 10 }, 98), 100)
  assert.equal(katrolScore(98, { ...base, method: 'tambah', poin: 10, maxKatrol: 90 }, 98), 90)
  assert.equal(katrolScore(0, { ...base, method: 'akar' }, 0), 0)
  assert.equal(katrolScore(50, { ...base, method: 'skala' }, 0), 50, 'tanpa nilai maksimum: tidak berubah')
})

test('nilai kosong tidak ikut dihitung dan skala memakai nilai tertinggi yang terisi', () => {
  const rows = katrolRows([
    { id: 1, nama: 'A', nilai: 45 },
    { id: 2, nama: 'B', nilai: null },
    { id: 3, nama: 'C', nilai: 90 },
    { id: 4, nama: 'D', nilai: undefined },
  ], { ...base, method: 'skala' })
  assert.deepEqual(rows.map(r => [r.id, r.katrol, r.delta]), [[1, 50, 5], [3, 100, 10]])
})

test('ringkasan: rata-rata dan ketuntasan sebelum dan sesudah', () => {
  const rows = katrolRows([{ id: 1, nama: 'A', nilai: 60 }, { id: 2, nama: 'B', nilai: 80 }], { ...base, method: 'kkm' })
  assert.deepEqual(katrolSummary(rows, 75), { jumlah: 2, rataAsli: 70, rataKatrol: 77.5, tuntasAsli: 1, tuntasKatrol: 2, berubah: 1 })
  assert.deepEqual(katrolSummary([], 75).jumlah, 0)
})
