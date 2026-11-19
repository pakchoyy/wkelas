import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getGradeNumber, getPhaseForGrade, getRecommendedMapel, isValidGrade, jenjangOf, nextClassName } from '../src/shared/mapelRecommendations.ts'

test('tingkat 1–12 dan fase Kurikulum Merdeka', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => getPhaseForGrade(String(g))), ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'D', 'E', 'F', 'F'])
  assert.equal(getGradeNumber('10'), 10)
  assert.equal(getGradeNumber('Kelas 12'), 12)
  assert.equal(getGradeNumber('13'), 1, 'di luar 1–12 kembali ke 1')
  assert.deepEqual([3, 8, 11].map(g => jenjangOf(g)), ['SD', 'SMP', 'SMA'])
  assert.ok(isValidGrade('12') && isValidGrade('7') && !isValidGrade('0') && !isValidGrade('13') && !isValidGrade('1a'))
})

test('rekomendasi mapel sesuai jenjang', () => {
  const names = g => getRecommendedMapel(String(g)).map(m => m.nama)
  assert.ok(names(4).includes('Ilmu Pengetahuan Alam dan Sosial'))
  assert.ok(!names(8).includes('Ilmu Pengetahuan Alam dan Sosial'))
  assert.ok(names(8).includes('Ilmu Pengetahuan Alam') && names(8).includes('Informatika'))
  assert.ok(names(10).includes('Fisika') && names(10).includes('Sejarah'))
  assert.ok(!names(11).includes('Fisika'), 'mapel pilihan kelas 11 ditambah guru sendiri')
  for (const g of [1, 7, 10, 12]) assert.equal(new Set(names(g)).size, names(g).length, 'tanpa duplikat')
})

test('nama kelas saat naik kelas', () => {
  assert.equal(nextClassName('6C', 6, 7), '7C')
  assert.equal(nextClassName('10 IPA 1', 10, 11), '11 IPA 1')
  assert.equal(nextClassName('Kelas 9B', 9, 10), 'Kelas 10B')
  assert.equal(nextClassName('XI-2', 11, 12), 'XI-2', 'angka romawi dibiarkan')
})
