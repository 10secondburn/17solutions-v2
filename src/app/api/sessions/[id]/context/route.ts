import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { contextStore } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

/**
 * GET /api/sessions/:id/context?moduleId=xxx
 * Gibt den parsed Output eines Moduls zurück (neueste Version)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params
    const moduleId = req.nextUrl.searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json(
        { error: 'moduleId query param required' },
        { status: 400 },
      )
    }

    const [entry] = await db.select().from(contextStore)
      .where(and(
        eq(contextStore.sessionId, sessionId),
        eq(contextStore.moduleId, moduleId),
      ))
      .orderBy(desc(contextStore.version))
      .limit(1)

    if (!entry) {
      return NextResponse.json(null, { status: 404 })
    }

    return NextResponse.json(entry.outputData)
  } catch (error: any) {
    console.error('GET /api/sessions/[id]/context error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 },
    )
  }
}
