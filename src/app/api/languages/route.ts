import { NextRequest, NextResponse } from 'next/server'
import { addUserLanguage, listUserLanguagesSummary, switchUserLanguage } from '@/lib/store'

export async function GET() {
  return NextResponse.json(listUserLanguagesSummary())
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { target_language?: string; activate?: boolean }
    if (!body.target_language) {
      return NextResponse.json({ error: 'target_language is required' }, { status: 400 })
    }
    const entry = addUserLanguage(body.target_language)
    if (body.activate !== false) {
      switchUserLanguage(entry.target_language)
    }
    return NextResponse.json(listUserLanguagesSummary(), { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to add language' },
      { status: 400 }
    )
  }
}
