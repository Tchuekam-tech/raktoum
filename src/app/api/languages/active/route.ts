import { NextRequest, NextResponse } from 'next/server'
import { getActiveLanguageState, listUserLanguagesSummary, switchUserLanguage } from '@/lib/store'

export async function GET() {
  const active = getActiveLanguageState()
  return NextResponse.json({
    target_language: active.target_language,
    is_active: true,
  })
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { target_language?: string }
    if (!body.target_language) {
      return NextResponse.json({ error: 'target_language is required' }, { status: 400 })
    }
    switchUserLanguage(body.target_language)
    return NextResponse.json(listUserLanguagesSummary())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to switch language' },
      { status: 400 }
    )
  }
}
