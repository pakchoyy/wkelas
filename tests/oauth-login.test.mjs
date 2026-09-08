import test from 'node:test'
import assert from 'node:assert/strict'

const { createInitialAuthGate, createSingleFlight, googleOAuthOptions } = await import('../src/lib/oauth-login.ts')

test('rapid repeated clicks start Google login only once', async () => {
  const runOnce = createSingleFlight()
  let calls = 0
  let release
  const pending = new Promise(resolve => { release = resolve })
  const action = async () => { calls += 1; await pending }

  const first = runOnce(action)
  const second = runOnce(action)
  assert.equal(calls, 1)
  release()
  await Promise.all([first, second])
})

test('Google login always asks which account to use', () => {
  assert.deepEqual(googleOAuthOptions('https://wkelas.web.id'), {
    provider: 'google',
    options: {
      redirectTo: 'https://wkelas.web.id/',
      queryParams: { prompt: 'select_account' },
    },
  })
})

test('an empty initial auth event cannot send an OAuth callback back to login', () => {
  const session = { user: { id: 'guru-1' } }
  const applied = []
  const gate = createInitialAuthGate(value => applied.push(value))

  gate.onAuthEvent(null)
  assert.deepEqual(applied, [])

  gate.resolveInitial(session)
  assert.deepEqual(applied, [session])

  gate.onAuthEvent(null)
  assert.deepEqual(applied, [session, null])
})
