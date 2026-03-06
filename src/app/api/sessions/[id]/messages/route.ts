import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { messages, sessions } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

// GET — Chat-Verlauf einer Session
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as any).id

  // Prüfe Session-Ownership
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .limit(1)

  if (!sess) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const result = await db.select().from(messages)
    .where(eq(messages.sessionId, id))
    .orderBy(asc(messages.createdAt))

  return NextResponse.json(result)
}
