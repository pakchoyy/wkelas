import test from 'node:test'
import assert from 'node:assert/strict'
import {decodeDropdown,dropdownText,encodeDropdown,safeDropdownOptions} from '../src/shared/dropdown.ts'

test('opening and saving existing dropdown preserves options including commas and quotes',() => {
  const original = ['Islam','Kristen','Lainnya, sebutkan','Pilihan "khusus"']
  assert.deepEqual(decodeDropdown(encodeDropdown(dropdownText(JSON.stringify(original)))),original)
})
test('line editor supports Windows newlines and rejects repeated or empty choices',() => {
  assert.deepEqual(decodeDropdown(encodeDropdown(' A\r\nB\r\n')),['A','B'])
  assert.throws(() => encodeDropdown('A\nA'),/berulang/)
  assert.throws(() => encodeDropdown('  \n '),/minimal/)
})
test('invalid stored options cannot silently become an editable empty list',() => {
  for (const raw of ['invalid','{}','[1,"A"]','null']) assert.throws(() => dropdownText(raw))
})
test('student dropdown rendering tolerates invalid old data without crashing',() => {
  assert.deepEqual(safeDropdownOptions('{broken'),[])
  assert.deepEqual(safeDropdownOptions('["A","B"]'),['A','B'])
})
