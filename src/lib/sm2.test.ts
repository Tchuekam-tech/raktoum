import test from 'node:test'
import assert from 'node:assert/strict'
import { sm2Update, isCardDue } from './sm2'

test('sm2Update progresses intervals 1 -> 6 -> round(interval * EF) for passing reviews', () => {
  const base = {
    repetitions: 0,
    interval: 1,
    ease_factor: 2.5,
    next_review: '2026-11-18',
  }
  const today = new Date('2026-11-18T00:00:00Z')

  const r1 = sm2Update(base, 4, today)
  assert.equal(r1.repetitions, 1)
  assert.equal(r1.interval, 1)
  assert.equal(r1.next_review, '2026-11-19')

  const r2 = sm2Update(r1, 5, today)
  assert.equal(r2.repetitions, 2)
  assert.equal(r2.interval, 6)
  assert.equal(r2.next_review, '2026-11-24')

  const r3 = sm2Update(r2, 4, today)
  assert.equal(r3.repetitions, 3)
  assert.equal(r3.interval, Math.round(6 * r2.ease_factor))
})

test('sm2Update resets repetitions and enforces minimum ease factor 1.3 on lapses', () => {
  const base = {
    repetitions: 4,
    interval: 22,
    ease_factor: 1.35,
    next_review: '2026-11-18',
  }
  const today = new Date('2026-11-18T00:00:00Z')
  const lapsed = sm2Update(base, 0, today)
  assert.equal(lapsed.repetitions, 0)
  assert.equal(lapsed.interval, 1)
  assert.equal(lapsed.ease_factor, 1.3)
  assert.equal(lapsed.next_review, '2026-11-19')
})

test('isCardDue compares UTC YYYY-MM-DD dates accurately', () => {
  const today = new Date('2026-11-18T12:00:00Z')
  assert.equal(isCardDue({ next_review: '2026-11-18' }, today), true)
  assert.equal(isCardDue({ next_review: '2026-11-17' }, today), true)
  assert.equal(isCardDue({ next_review: '2026-11-19' }, today), false)
})
