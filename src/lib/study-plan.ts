import {
  CEFRLevel,
  COMPLETION_UNIT_ID,
  CurriculumI18n,
  CurriculumUnit,
  DayPlan,
  LESSON_TYPES,
  LessonType,
  StudyPlan,
  WeekPlan,
} from './types'

export class PlanCapacityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanCapacityError'
  }
}

export function assertPlanCapacity(
  units: CurriculumUnit[],
  totalWeeks: number,
  daysPerWeek: number
): void {
  if (totalWeeks < 1 || daysPerWeek < 1) {
    throw new PlanCapacityError(
      'Plan dimensions must be positive: both duration_weeks and days_per_week must be at least 1.'
    )
  }

  const teachingSlots = totalWeeks * daysPerWeek - 1
  const unitCount = units.length
  if (unitCount === 0) {
    throw new PlanCapacityError(
      'This level has no curriculum units, so no study plan can be built for it.'
    )
  }
  if (teachingSlots >= unitCount) {
    return
  }

  const weeksNeeded = Math.ceil((unitCount + 1) / daysPerWeek)
  throw new PlanCapacityError(
    `This plan is too short to cover all ${unitCount} curriculum units: ${totalWeeks} weeks × ${daysPerWeek} days leaves ${Math.max(teachingSlots, 0)} teaching slot(s) once the final completion test is reserved. Allow at least ${unitCount + 1} plan days in total (${unitCount} lessons + 1 completion test). Use at least ${weeksNeeded} weeks × ${daysPerWeek} days to give each unit at least one lesson.`
  )
}

function compareTuples(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}

function popCount(mask: number): number {
  let count = 0
  let n = mask
  while (n > 0) {
    count += n & 1
    n >>= 1
  }
  return count
}

/**
 * Exact port of _select_rotations from backend/app/data/curriculum.py.
 */
function selectRotations(units: CurriculumUnit[], quotas: number[]): number[] {
  const declared: LessonType[] = []
  const ownerCount = new Map<LessonType, number>()

  for (const unit of units) {
    const seen = new Set<LessonType>()
    const types: LessonType[] = unit.lesson_types.length > 0 ? unit.lesson_types : ['grammar']
    for (const lt of types) {
      if (seen.has(lt)) continue
      seen.add(lt)
      if (!ownerCount.has(lt)) {
        ownerCount.set(lt, 0)
        declared.push(lt)
      }
      ownerCount.set(lt, (ownerCount.get(lt) ?? 0) + 1)
    }
  }

  const canonical = new Map<LessonType, number>(LESSON_TYPES.map((lt, idx) => [lt, idx]))
  const priority = [...declared].sort((a, b) => {
    const diffCount = (ownerCount.get(a) ?? 0) - (ownerCount.get(b) ?? 0)
    if (diffCount !== 0) return diffCount
    return (canonical.get(a) ?? LESSON_TYPES.length) - (canonical.get(b) ?? LESSON_TYPES.length)
  })
  const typeIndex = new Map<LessonType, number>(priority.map((lt, idx) => [lt, idx]))

  let states = new Map<number, number[]>([[0, []]])

  for (let uIdx = 0; uIdx < units.length; uIdx++) {
    const unit = units[uIdx]
    const quota = quotas[uIdx]
    const cycle: LessonType[] = unit.lesson_types.length > 0 ? unit.lesson_types : ['grammar']
    const length = cycle.length
    const rotations =
      quota > 0 && quota < length ? Array.from({ length }, (_, idx) => idx) : [0]

    const candidates: Array<[number, number]> = rotations.map((rotation) => {
      let mask = 0
      const limit = Math.min(quota, length)
      for (let step = 0; step < limit; step++) {
        const lt = cycle[(rotation + step) % length]
        const bit = typeIndex.get(lt) ?? 0
        mask |= 1 << bit
      }
      return [rotation, mask]
    })

    const nextStates = new Map<number, number[]>()
    for (const [mask, chosen] of states.entries()) {
      for (const [rotation, added] of candidates) {
        const combined = mask | added
        const candidate = [...chosen, rotation]
        const existing = nextStates.get(combined)
        if (!existing || compareTuples(candidate, existing) < 0) {
          nextStates.set(combined, candidate)
        }
      }
    }
    states = nextStates
  }

  let bestMask = 0
  let bestScoreBits: number[] = []
  let bestPop = -1

  for (const mask of states.keys()) {
    const bits = popCount(mask)
    const vec = priority.map((_, idx) => (mask >> idx) & 1)
    if (
      bits > bestPop ||
      (bits === bestPop && compareTuples(vec, bestScoreBits) > 0)
    ) {
      bestPop = bits
      bestScoreBits = vec
      bestMask = mask
    }
  }

  return states.get(bestMask) ?? units.map(() => 0)
}

function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

const DEFAULT_I18N: CurriculumI18n = {
  lesson_title: '{title} - Lesson {n}',
  test_unit_title: 'Level {level} Completion Test',
  test_title: 'Level {level} Completion Test',
  test_objectives: [
    'Review all grammar topics from this level',
    'Complete the assessment to unlock the next level',
  ],
}

export function distributeUnits(
  units: CurriculumUnit[],
  totalWeeks: number,
  daysPerWeek: number,
  i18n: CurriculumI18n = DEFAULT_I18N
): DayPlan[] {
  if (units.length === 0) return []

  const totalSlots = totalWeeks * daysPerWeek
  const teachingSlots = totalSlots - 1
  const testSlot = totalSlots - 1

  const nUnits = units.length
  const baseQuota = Math.floor(teachingSlots / nUnits)
  const remainder = teachingSlots % nUnits
  const quotas = units.map((_, idx) => baseQuota + (idx < remainder ? 1 : 0))

  const rotations = selectRotations(units, quotas)
  const slots: DayPlan[] = []
  const level = units[0].level

  for (let unitIdx = 0; unitIdx < nUnits; unitIdx++) {
    const unit = units[unitIdx]
    const quota = quotas[unitIdx]
    const rotation = rotations[unitIdx]
    const ltList: LessonType[] = unit.lesson_types.length > 0 ? unit.lesson_types : ['grammar']
    const cycle = ltList.length
    const gps = unit.grammar_points ?? []
    const checklist = unit.competency_checklist ?? []
    const vocabIds = unit.vocabulary_set_ids ?? []

    for (let perUnitIdx = 0; perUnitIdx < quota; perUnitIdx++) {
      const lt = ltList[(rotation + perUnitIdx) % cycle]
      const slotIndex = slots.length
      slots.push({
        slot_index: slotIndex,
        week: Math.floor(slotIndex / daysPerWeek) + 1,
        day: (slotIndex % daysPerWeek) + 1,
        unit_id: unit.id,
        unit_title: unit.title,
        lesson_type: lt,
        title: formatTemplate(i18n.lesson_title, { title: unit.title, n: perUnitIdx + 1 }),
        objectives: checklist.slice(0, 2),
        estimated_minutes: 25,
        grammar_points: gps.slice(0, 2),
        vocabulary_set_ids: vocabIds.slice(0, 1),
        completed: false,
        completed_at: null,
      })
    }
  }

  slots.push({
    slot_index: testSlot,
    week: Math.floor(testSlot / daysPerWeek) + 1,
    day: (testSlot % daysPerWeek) + 1,
    unit_id: COMPLETION_UNIT_ID,
    unit_title: formatTemplate(i18n.test_unit_title, { level }),
    lesson_type: 'review',
    title: formatTemplate(i18n.test_title, { level }),
    objectives: i18n.test_objectives,
    estimated_minutes: 45,
    grammar_points: units[units.length - 1].grammar_points,
    vocabulary_set_ids: [],
    completed: false,
    completed_at: null,
  })

  return slots
}

export function buildStudyPlan(params: {
  id: string
  targetLanguage: string
  languageName: string
  cefrLevel: CEFRLevel
  durationWeeks: number
  daysPerWeek: number
  units: CurriculumUnit[]
  i18n?: CurriculumI18n
}): StudyPlan {
  const { id, targetLanguage, languageName, cefrLevel, durationWeeks, daysPerWeek, units, i18n } =
    params
  assertPlanCapacity(units, durationWeeks, daysPerWeek)
  const slots = distributeUnits(units, durationWeeks, daysPerWeek, i18n)

  const weeksMap = new Map<number, DayPlan[]>()
  for (const slot of slots) {
    const arr = weeksMap.get(slot.week) ?? []
    arr.push(slot)
    weeksMap.set(slot.week, arr)
  }

  const weeklyPlan: WeekPlan[] = [...weeksMap.keys()]
    .sort((a, b) => a - b)
    .map((weekNum) => {
      const days = weeksMap.get(weekNum) ?? []
      return {
        week: weekNum,
        theme: days[0]?.unit_title ?? '',
        days,
      }
    })

  const totalDays = durationWeeks * daysPerWeek
  return {
    id,
    target_language: targetLanguage,
    title: `${languageName} ${cefrLevel} — ${durationWeeks}-week programme`,
    cefr_level: cefrLevel,
    duration_weeks: durationWeeks,
    days_per_week: daysPerWeek,
    ends_with_test: true,
    progress_day: 0,
    total_days: totalDays,
    completion_pct: 0,
    created_at: new Date().toISOString(),
    weekly_plan: weeklyPlan,
  }
}

export function computeStreak(datesWithActivity: string[], todayIso: string): number {
  const active = new Set(datesWithActivity)
  let streak = 0
  const [y, m, d] = todayIso.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))

  if (!active.has(todayIso)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (!active.has(key)) break
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
