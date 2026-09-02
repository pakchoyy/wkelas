import test from 'node:test'
import assert from 'node:assert/strict'
import { visibleTasks } from '../src/shared/todo-view.ts'

const today = '2026-09-02'
const tasks = [
  { id: 1, judul: 'Rekap', deadline: '2026-09-01', prioritas: 'normal' },
  { id: 2, judul: 'Rapor', deadline: today, prioritas: 'normal' },
  { id: 3, judul: 'Kelas', deadline: today, prioritas: 'tinggi', deskripsi: 'Siapkan bahan' },
  { id: 4, judul: 'Besok', deadline: '2026-09-03' },
  { id: 5, judul: 'Tanpa tanggal' },
  { id: 6, judul: 'Selesai', deadline: '2026-09-01', status: 'selesai' },
]
test('task filters respect completion and inclusive date boundaries', () => {
  for (const [filter, ids] of [['terlambat', [1]], ['hari-ini', [3, 2]], ['mendatang', [4]], ['selesai', [6]]]) {
    assert.deepEqual(visibleTasks(tasks, filter, today).map(row => row.id), ids)
  }
})
test('tasks sort by deadline then priority, without mutating source', () => {
  assert.deepEqual(visibleTasks(tasks, 'aktif', today).map(row => row.id), [1, 3, 2, 4, 5])
  assert.deepEqual(tasks.map(row => row.id), [1, 2, 3, 4, 5, 6])
})
test('search ignores case and surrounding whitespace, includes description', () => {
  assert.deepEqual(visibleTasks(tasks, 'aktif', today, '  BAHAN ').map(row => row.id), [3])
  assert.equal(visibleTasks(tasks, 'aktif', today, 'selesai').length, 0)
})
