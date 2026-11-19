import { NextRequest, NextResponse } from 'next/server'
import { listUserLanguagesSummary, removeUserLanguage } from '@/lib/store'

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    removeUserLanguage(code)
    return NextResponse.json(listUserLanguagesSummary())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to delete language' },
      { status: 400 }
    )
  }
}
