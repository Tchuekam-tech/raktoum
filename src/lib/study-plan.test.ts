import test from 'node:test'
import assert from 'node:assert/strict'
import { assertPlanCapacity, computeStreak, distributeUnits, PlanCapacityError } from './study-plan'
import type { CurriculumUnit } from './types'

const sampleUnits: CurriculumUnit[] = [
  {
    id: 'a1-unit-1',
    level: 'A1',
    unit_number: 1,
    title: 'Identity & Greetings',
    grammar_points: ['to-be'],
    vocabulary_set_ids: ['greetings_a1'],
    lesson_types: ['grammar', 'vocabulary', 'reading'],
    competency_checklist: ['Introduce yourself'],
    default_weeks: 2,
    prerequisite_unit: null,
  },
  {
    id: 'a1-unit-2',
    level: 'A1',
    unit_number: 2,
    title: 'Daily Life',
    grammar_points: ['present-simple'],
    vocabulary_set_ids: ['daily_routines_a1'],
    lesson_types: ['grammar', 'vocabulary', 'listening'],
    competency_checklist: ['Describe daily routines'],
    default_weeks: 2,
    prerequisite_unit: 'a1-unit-1',
  },
  {
    id: 'a1-unit-3',
    level: 'A1',
    unit_number: 3,
    title: 'Places',
    grammar_points: ['prepositions-place'],
    vocabulary_set_ids: ['home_a1'],
    lesson_types: ['grammar', 'writing', 'review'],
    competency_checklist: ['Describe places'],
    default_weeks: 2,
    prerequisite_unit: 'a1-unit-2',
  },
]

test('assertPlanCapacity rejects plans too short for units + completion test', () => {
  assert.throws(() => assertPlanCapacity(sampleUnits, 1, 3), PlanCapacityError)
  assert.doesNotThrow(() => assertPlanCapacity(sampleUnits, 1, 4))
})

test('distributeUnits reserves final slot for completion-test and balances unit quotas', () => {
  const slots = distributeUnits(sampleUnits, 2, 4)
  assert.equal(slots.length, 8)
  assert.equal(slots[7].unit_id, 'completion-test')

  const counts = new Map<string, number>()
  for (const s of slots.slice(0, 7)) {
    counts.set(s.unit_id, (counts.get(s.unit_id) ?? 0) + 1)
  }
  assert.equal(counts.get('a1-unit-1'), 3)
  assert.equal(counts.get('a1-unit-2'), 2)
  assert.equal(counts.get('a1-unit-3'), 2)
})

test('computeStreak counts consecutive UTC activity days including yesterday fallback', () => {
  assert.equal(computeStreak(['2026-11-16', '2026-11-17', '2026-11-18'], '2026-11-18'), 3)
  assert.equal(computeStreak(['2026-11-16', '2026-11-17'], '2026-11-18'), 2)
  assert.equal(computeStreak(['2026-11-15'], '2026-11-18'), 0)
})
