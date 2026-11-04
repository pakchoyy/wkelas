import test from 'node:test'
import assert from 'node:assert/strict'
import { activePromo, priceBreakdown, rupiah } from '../src/shared/subscription.ts'

const at = iso => Date.parse(iso)

test('normal price is about Rp130 a day and Rp3.900 a month for 6 months', () => {
  const p = priceBreakdown(at('2026-12-15T10:00:00+07:00'))
  assert.equal(p.promo, null)
  assert.equal(p.perDay, 130)
  assert.equal(p.perMonth, 3900)
  assert.equal(p.months, 5)
})

test('November promo runs only in November (WIB) and lasts until 30 June 2027', () => {
  assert.equal(activePromo(at('2026-10-31T23:59:00+07:00')), null)
  assert.ok(activePromo(at('2026-11-01T00:00:00+07:00')))
  assert.ok(activePromo(at('2026-11-30T23:59:00+07:00')))
  assert.equal(activePromo(at('2026-12-01T00:00:00+07:00')), null)
  const early = priceBreakdown(at('2026-11-06T09:00:00+07:00'))
  assert.equal(early.months, 7)
  assert.equal(early.perDay, 100)
  const late = priceBreakdown(at('2026-11-30T20:00:00+07:00'))
  assert.ok(late.perDay > early.perDay, 'beli lebih awal = lebih murah per hari')
  assert.ok(late.days > 200)
})

test('rupiah uses Indonesian thousands separator', () => {
  assert.equal(rupiah(23000), 'Rp23.000')
})
