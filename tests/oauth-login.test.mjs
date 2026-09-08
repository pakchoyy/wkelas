import test from 'node:test'
import assert from 'node:assert/strict'

const { createSingleFlight, googleOAuthOptions } = await import('../src/lib/oauth-login.ts')

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
