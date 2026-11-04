import test from 'node:test'
import assert from 'node:assert/strict'
import { childFolders, folderOptions, folderPath, isFolderEmpty, pathLabel, validateFolderName, validateLinkUrl, visibleFolderIds } from '../src/shared/pak-choy-folders.ts'

const f = (id, parent_id, name, sort_order = 0) => ({ id, parent_id, name, sort_order, created_at: 'x' })
const folders = [f('modul', null, 'Modul'), f('k1', 'modul', 'Kelas 1'), f('k10', 'modul', 'Kelas 10'), f('k2', 'modul', 'Kelas 2'), f('lkpd', null, 'LKPD')]

test('folder names are trimmed and validated', () => {
  assert.equal(validateFolderName('  Modul   Ajar '), 'Modul Ajar')
  assert.throws(() => validateFolderName('   '), /nama folder/)
  assert.throws(() => validateFolderName('x'.repeat(121)), /120/)
})

test('links must be https without spaces', () => {
  assert.equal(validateLinkUrl(' https://youtu.be/abc '), 'https://youtu.be/abc')
  assert.throws(() => validateLinkUrl('http://a.b'), /https/)
  assert.throws(() => validateLinkUrl('https://a b.com'), /https/)
  assert.throws(() => validateLinkUrl('javascript:alert(1)'), /https/)
})

test('children are sorted naturally (Kelas 2 before Kelas 10)', () => {
  assert.deepEqual(childFolders(folders, 'modul').map(x => x.name), ['Kelas 1', 'Kelas 2', 'Kelas 10'])
  assert.deepEqual(childFolders(folders, null).map(x => x.name), ['LKPD', 'Modul'])
})

test('path and labels follow the tree and survive corrupt cycles', () => {
  assert.equal(pathLabel(folders, 'k2'), 'Modul › Kelas 2')
  assert.equal(pathLabel(folders, null), 'Paling atas')
  assert.deepEqual(folderPath(folders, 'zzz'), [])
  const loop = [f('a', 'b', 'A'), f('b', 'a', 'B')]
  assert.equal(folderPath(loop, 'a').length, 2)
})

test('move-to options list every folder with its path', () => {
  const labels = folderOptions(folders).map(o => o.label)
  assert.deepEqual(labels, ['Paling atas', 'LKPD', 'Modul', 'Modul › Kelas 1', 'Modul › Kelas 2', 'Modul › Kelas 10'])
})

test('teachers only see folders that lead to published items', () => {
  const items = [{ folder_id: 'k1', published: true }, { folder_id: 'k2', published: false }, { folder_id: null, published: true }]
  assert.deepEqual([...visibleFolderIds(folders, items)].sort(), ['k1', 'modul'])
})

test('only empty folders can be deleted', () => {
  const items = [{ folder_id: 'k1' }]
  assert.equal(isFolderEmpty(folders, items, 'k1'), false)
  assert.equal(isFolderEmpty(folders, items, 'modul'), false)
  assert.equal(isFolderEmpty(folders, items, 'lkpd'), true)
  assert.equal(isFolderEmpty(folders, items, 'k2'), true)
})

test('link labels describe the destination', async () => {
  const { linkKind } = await import('../src/shared/pak-choy-folders.ts')
  assert.equal(linkKind('https://drive.google.com/drive/folders/abc?usp=drive_link'), 'Folder Google Drive')
  assert.equal(linkKind('https://drive.google.com/file/d/abc/view'), 'File Google Drive')
  assert.equal(linkKind('https://youtu.be/x'), 'Video YouTube')
  assert.equal(linkKind('https://s.id/Buku-SD-Kelas-1'), 'Tautan unduhan')
  assert.equal(linkKind('https://www.contoh.sch.id/a'), 'contoh.sch.id')
  assert.equal(linkKind(null), 'Link')
})
