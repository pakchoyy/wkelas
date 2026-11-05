import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guessAvatar, resolveAvatar, initials } from '../src/shared/avatar.ts'

test('tebak avatar dari gelar dan nama', () => {
  assert.equal(guessAvatar('Bu Sri Wahyuni'), 'bu-hijab')
  assert.equal(guessAvatar('Pak Budi'), 'pak')
  assert.equal(guessAvatar('Muhammad Choiruddin, S.Pd.'), 'pak')
  assert.equal(guessAvatar('Siti Aminah'), 'bu-hijab')
  assert.equal(guessAvatar('Rahayu Ningsih'), 'bu-hijab')
  assert.equal(guessAvatar('Endang Lestari'), 'bu-hijab')
  assert.equal(guessAvatar('Joko Widodo'), 'pak')
  assert.equal(guessAvatar('Andreas Setiawan'), 'inisial')
  assert.equal(guessAvatar(''), 'inisial')
})

test('pilihan manual menang atas tebakan', () => {
  assert.equal(resolveAvatar('bu', 'Pak Budi'), 'bu')
  assert.equal(resolveAvatar('auto', 'Pak Budi'), 'pak')
  assert.equal(resolveAvatar(null, 'Siti'), 'bu-hijab')
})

test('inisial tanpa gelar', () => {
  assert.equal(initials('Pak Budi Santoso'), 'BS')
  assert.equal(initials(''), 'G')
})
