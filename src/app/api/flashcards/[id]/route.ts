import { NextRequest, NextResponse } from 'next/server'
import { deleteFlashcard, reviewFlashcard } from '@/lib/store'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await req.json()) as { quality?: number }
    if (typeof body.quality !== 'number' || body.quality < 0 || body.quality > 5) {
      return NextResponse.json({ error: 'quality must be a number between 0 and 5' }, { status: 400 })
    }
    const result = reviewFlashcard(id, body.quality)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to review flashcard' },
      { status: 404 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    deleteFlashcard(id)
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to delete flashcard' },
      { status: 404 }
    )
  }
}
