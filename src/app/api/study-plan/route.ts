import { NextRequest, NextResponse } from 'next/server'
import { getLanguageDataset, getLanguageMeta } from '@/lib/data-loader'
import { createNewPlanForLanguage, getActiveLanguageState } from '@/lib/store'
import { PlanCapacityError } from '@/lib/study-plan'
import { CEFRLevel, CEFR_LEVELS } from '@/lib/types'

export async function GET() {
  const activeState = getActiveLanguageState()
  const dataset = getLanguageDataset(activeState.target_language)
  const meta = getLanguageMeta(activeState.target_language)

  const unitCounts: Record<CEFRLevel, number> = {
    A1: dataset.curriculum.A1?.length ?? 0,
    A2: dataset.curriculum.A2?.length ?? 0,
    B1: dataset.curriculum.B1?.length ?? 0,
    B2: dataset.curriculum.B2?.length ?? 0,
    C1: dataset.curriculum.C1?.length ?? 0,
    C2: dataset.curriculum.C2?.length ?? 0,
  }

  return NextResponse.json({
    target_language: activeState.target_language,
    meta,
    plan: activeState.plan,
    curriculum: dataset.curriculum,
    unit_counts: unitCounts,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      cefr_level?: CEFRLevel
      duration_weeks?: number
      days_per_week?: number
    }

    const cefrLevel = body.cefr_level ?? 'A1'
    if (!CEFR_LEVELS.includes(cefrLevel)) {
      return NextResponse.json({ error: 'Invalid CEFR level' }, { status: 400 })
    }

    const durationWeeks = Number(body.duration_weeks ?? 4)
    const daysPerWeek = Number(body.days_per_week ?? 5)

    const plan = createNewPlanForLanguage({
      cefrLevel,
      durationWeeks,
      daysPerWeek,
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (err) {
    if (err instanceof PlanCapacityError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to generate study plan' },
      { status: 400 }
    )
  }
}
