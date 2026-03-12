import { NextRequest, NextResponse } from 'next/server'
import { saveSelection, getSelections } from '@/lib/context-store/store'

/**
 * POST /api/selections — Speichert eine Nutzer-Selektion
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, moduleId, selectedItems } = body

    if (!sessionId || !moduleId || !Array.isArray(selectedItems)) {
      return NextResponse.json(
        { error: 'sessionId, moduleId, and selectedItems[] are required' },
        { status: 400 },
      )
    }

    await saveSelection({ sessionId, moduleId, selectedItems })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('POST /api/selections error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/selections?sessionId=xxx — Lädt alle Selektionen einer Session
 */
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query param required' },
        { status: 400 },
      )
    }

    const selections = await getSelections(sessionId)

    return NextResponse.json({ selections })
  } catch (error: any) {
    console.error('GET /api/selections error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 },
    )
  }
}
