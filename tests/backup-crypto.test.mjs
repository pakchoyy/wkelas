import test from 'node:test'
import assert from 'node:assert/strict'
const { encryptBackup, decryptBackup, isEncryptedBackup } = await import('../src/lib/backup-crypto.ts')

test('encrypted backup round-trips and hides content', async () => {
  const plain = JSON.stringify({ format: 'bgy-wali-kelas-backup', tables: { siswa: [{ nama: 'Ahmad Fauzi' }] } })
  const box = await encryptBackup(plain, 'rahasia-guru')
  assert.equal(isEncryptedBackup(box), true)
  assert.equal(isEncryptedBackup(plain), false)
  assert.equal(box.includes('Ahmad'), false)
  assert.equal(await decryptBackup(box, 'rahasia-guru'), plain)
  await assert.rejects(decryptBackup(box, 'salah-sandi'), /Kata sandi salah/)
  await assert.rejects(encryptBackup(plain, 'pendek'), /minimal 8/)
})
