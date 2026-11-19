import { NextRequest, NextResponse } from 'next/server'
import { addTutorMemory, deleteTutorMemory, getStore } from '@/lib/store'

export async function GET() {
  return NextResponse.json({ memories: getStore().memories })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { content?: string }
    const memory = addTutorMemory(body.content ?? '')
    return NextResponse.json({ memory, memories: getStore().memories }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to save memory' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }
  deleteTutorMemory(id)
  return NextResponse.json({ memories: getStore().memories })
}
