import { NextRequest, NextResponse } from 'next/server'
import { isCardDue } from '@/lib/sm2'
import { createFlashcard, getActiveLanguageState } from '@/lib/store'
import { getLanguageMeta } from '@/lib/data-loader'

export async function GET() {
  const activeState = getActiveLanguageState()
  const meta = getLanguageMeta(activeState.target_language)
  const due = activeState.flashcards.filter((c) => isCardDue(c))

  return NextResponse.json({
    target_language: activeState.target_language,
    meta,
    flashcards: activeState.flashcards,
    due_flashcards: due,
    due_count: due.length,
    total_count: activeState.flashcards.length,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      word?: string
      definition?: string
      example_sentence?: string
      translation?: string
      source?: 'manual' | 'vocabulary' | 'phrasebook' | 'lesson'
    }
    const card = createFlashcard({
      word: body.word ?? '',
      definition: body.definition ?? '',
      example_sentence: body.example_sentence ?? '',
      translation: body.translation,
      source: body.source ?? 'manual',
    })
    return NextResponse.json({ card }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to create flashcard' },
      { status: 400 }
    )
  }
}
