import { NextRequest, NextResponse } from 'next/server'
import { getLanguageDataset } from '@/lib/data-loader'
import { completeLessonSlot, getActiveLanguageState } from '@/lib/store'

export async function GET(req: NextRequest) {
  const slotParam = req.nextUrl.searchParams.get('slot')
  const slotIndex = Number(slotParam)
  const activeState = getActiveLanguageState()
  if (!activeState.plan || Number.isNaN(slotIndex)) {
    return NextResponse.json({ error: 'Lesson slot not found' }, { status: 404 })
  }

  const slot = activeState.plan.weekly_plan
    .flatMap((w) => w.days)
    .find((d) => d.slot_index === slotIndex)
  if (!slot) {
    return NextResponse.json({ error: 'Lesson slot not found' }, { status: 404 })
  }

  const dataset = getLanguageDataset(activeState.target_language)
  const grammarTopics = dataset.grammar.filter((g) => slot.grammar_points.includes(g.slug))
  const vocabSets = dataset.vocabulary.filter((v) => slot.vocabulary_set_ids.includes(v.id))
  const words = vocabSets.flatMap((v) => v.words).slice(0, 8)

  // Pull up to 4 real assessment questions matching this lesson's grammar points or CEFR level.
  const levelQuestions = dataset.assessment.filter(
    (q) =>
      q.difficulty === activeState.plan?.cefr_level &&
      (slot.grammar_points.length === 0 ||
        (q.grammar_slug && slot.grammar_points.includes(q.grammar_slug)))
  )
  const fallbackLevelQuestions = dataset.assessment.filter(
    (q) => q.difficulty === activeState.plan?.cefr_level
  )
  const exercises = (levelQuestions.length >= 3 ? levelQuestions : fallbackLevelQuestions).slice(0, 4)

  return NextResponse.json({
    target_language: activeState.target_language,
    slot,
    grammar_topics: grammarTopics,
    vocabulary_words: words,
    exercises,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { slot_index?: number }
    if (typeof body.slot_index !== 'number') {
      return NextResponse.json({ error: 'slot_index is required' }, { status: 400 })
    }
    const result = completeLessonSlot(body.slot_index)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to complete lesson' },
      { status: 400 }
    )
  }
}
