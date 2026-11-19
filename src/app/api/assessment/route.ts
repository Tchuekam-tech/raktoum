import { NextRequest, NextResponse } from 'next/server'
import { evaluateAdaptiveQuiz, selectPlacementQuiz } from '@/lib/assessment'
import { getLanguageDataset, getLanguageMeta } from '@/lib/data-loader'
import { getActiveLanguageState, recordActivity } from '@/lib/store'
import type { AnswerRecord } from '@/lib/types'

export async function GET() {
  const activeState = getActiveLanguageState()
  const dataset = getLanguageDataset(activeState.target_language)
  const meta = getLanguageMeta(activeState.target_language)
  const questions = selectPlacementQuiz(dataset.assessment)

  return NextResponse.json({
    target_language: activeState.target_language,
    meta,
    questions,
    last_assessment: activeState.last_assessment,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { answers?: AnswerRecord[] }
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json({ error: 'At least one answer is required' }, { status: 400 })
    }

    const activeState = getActiveLanguageState()
    const result = evaluateAdaptiveQuiz(body.answers)
    activeState.last_assessment = result
    recordActivity(activeState, { xp_earned: 30 })

    return NextResponse.json({
      target_language: activeState.target_language,
      result,
      xp_awarded: 30,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to evaluate quiz' },
      { status: 400 }
    )
  }
}
