import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mapelOptions, tpList, matchMapel, lengthStatus, ERAPOR_MAX } from '../src/shared/tp-bank.ts'

const bank = JSON.parse(readFileSync(new URL('../public/data/tp-bank.json', import.meta.url), 'utf8'))

test('bank TP SD berisi kelas 1–6 untuk kedua sumber CP', () => {
  assert.deepEqual(Object.keys(bank.cp2025).sort(), ['1', '2', '3', '4', '5', '6'])
  assert.deepEqual(Object.keys(bank.cp2026).sort(), ['1', '2', '3', '4', '5', '6'])
  const mapel = mapelOptions(bank, 'cp2025', 5, 1)
  assert.ok(mapel.includes('Matematika'))
  assert.ok(tpList(bank, 'cp2025', 5, 1, 'Matematika').length > 0)
  assert.deepEqual(tpList(bank, 'cp2025', 9, 1, 'Matematika'), [], 'kelas di luar SD kosong')
})

test('TP mapel umum CP 2025 muat di e-Rapor (≤100 karakter)', () => {
  for (const k of Object.keys(bank.cp2025)) for (const s of Object.keys(bank.cp2025[k])) for (const tps of Object.values(bank.cp2025[k][s]))
    for (const tp of tps) assert.ok(tp.length <= ERAPOR_MAX, tp)
})

test('nama mapel Wkelas dicocokkan dengan nama di bank', () => {
  const opts = mapelOptions(bank, 'cp2025', 5, 1)
  assert.equal(matchMapel(opts, 'Matematika'), 'Matematika')
  assert.equal(matchMapel(opts, 'PPKn'), 'Pendidikan Pancasila')
  assert.equal(matchMapel(opts, 'IPA'), 'IPAS')
  assert.equal(matchMapel(opts, 'PJOK'), 'PJOK')
  assert.equal(matchMapel(opts, 'Bahasa Indonesia'), 'Bahasa Indonesia')
  assert.equal(matchMapel(opts, 'Mulok Bahasa Jawa'), null)
})

test('penanda panjang untuk e-Rapor', () => {
  assert.equal(lengthStatus('a'.repeat(100)), 'ok')
  assert.equal(lengthStatus('a'.repeat(101)), 'panjang')
})
