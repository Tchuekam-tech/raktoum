import { NextResponse } from 'next/server'
import { getLanguageDataset, getLanguageMeta } from '@/lib/data-loader'
import { isCardDue } from '@/lib/sm2'
import {
  buildLast7Days,
  getActiveLanguageState,
  getStore,
  listUserLanguagesSummary,
  summarizeLanguage,
} from '@/lib/store'

export async function GET() {
  const store = getStore()
  const activeState = getActiveLanguageState()
  const meta = getLanguageMeta(activeState.target_language)
  const dataset = getLanguageDataset(activeState.target_language)

  const summary = summarizeLanguage(activeState, true)
  const last7Days = buildLast7Days(activeState)
  const dueFlashcards = activeState.flashcards.filter((c) => isCardDue(c))

  const nextLesson =
    activeState.plan?.weekly_plan.flatMap((w) => w.days).find((d) => !d.completed) ?? null

  return NextResponse.json({
    active_language: activeState.target_language,
    meta,
    summary,
    plan: activeState.plan,
    next_lesson: nextLesson,
    last_assessment: activeState.last_assessment,
    last_7_days: last7Days,
    due_flashcards_count: dueFlashcards.length,
    total_flashcards_count: activeState.flashcards.length,
    recent_games: activeState.game_sessions.slice(0, 6),
    saved_grammar_count: activeState.saved_grammar_slugs.size,
    dataset_counts: {
      grammar_topics: dataset.grammar.length,
      vocabulary_sets: dataset.vocabulary.length,
      phrasebook_categories: dataset.phrasebook.length,
      assessment_questions: dataset.assessment.length,
    },
    memories: store.memories,
    languages_overview: listUserLanguagesSummary(),
  })
}
