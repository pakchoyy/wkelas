import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Google OAuth uses PKCE so its callback does not collide with the hash router', async () => {
  const clientSource = await readFile(new URL('../src/lib/document-client.ts', import.meta.url), 'utf8')
  const authSource = await readFile(new URL('../src/lib/user-auth.ts', import.meta.url), 'utf8')

  assert.match(clientSource, /flowType:\s*['"]pkce['"]/, 'Supabase must return ?code= instead of putting tokens in #')
  assert.match(clientSource, /detectSessionInUrl:\s*false/, 'the app exchanges the PKCE callback before route guards run')
  assert.match(authSource, /searchParams\.get\(['"]code['"]\)/, 'the callback code must be exchanged before checking the session')
})
