import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'freelingo-node',
    version: '1.14.10',
  })
}
