// Cadangan terlindungi kata sandi: AES-256-GCM, kunci dari PBKDF2-SHA256.
const FORMAT = 'bgy-wali-kelas-backup-encrypted'
const ITERATIONS = 310000

const toB64 = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s) }
const fromB64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0))

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export function isEncryptedBackup(text: string) {
  try { return JSON.parse(text)?.format === FORMAT } catch { return false }
}

export async function encryptBackup(plain: string, password: string): Promise<string> {
  if (password.length < 8) throw new Error('Kata sandi cadangan minimal 8 karakter.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, ITERATIONS)
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)))
  return JSON.stringify({ format: FORMAT, version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS }, salt: toB64(salt), iv: toB64(iv), data: toB64(data) })
}

export async function decryptBackup(text: string, password: string): Promise<string> {
  const box = JSON.parse(text)
  if (box?.format !== FORMAT || box.version !== 1) throw new Error('Format cadangan terlindungi tidak dikenal.')
  try {
    const key = await deriveKey(password, fromB64(box.salt), Number(box.kdf?.iterations) || ITERATIONS)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.data))
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('Kata sandi salah atau file cadangan rusak. Data saat ini tidak diubah.')
  }
}
