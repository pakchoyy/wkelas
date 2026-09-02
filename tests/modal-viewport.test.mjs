import test from 'node:test'
import assert from 'node:assert/strict'
import { modalViewport } from '../src/shared/modal-viewport.ts'

test('dialog fits visible area before and after keyboard opens', () => {
  assert.deepEqual(modalViewport(800),{top:400,maxHeight:768})
  assert.deepEqual(modalViewport(320),{top:160,maxHeight:288})
})
test('dialog follows visual viewport panning without leaving visible bounds', () => {
  const frame=modalViewport(300,120)
  assert.equal(frame.top-frame.maxHeight/2,136)
  assert.equal(frame.top+frame.maxHeight/2,404)
})
test('tiny viewport never produces a negative dialog height', () => {
  for (const height of [0,10,25]) {
    const frame=modalViewport(height)
    assert.ok(frame.maxHeight>=0)
    assert.ok(frame.top-frame.maxHeight/2>=0)
    assert.ok(frame.top+frame.maxHeight/2<=height)
  }
})
