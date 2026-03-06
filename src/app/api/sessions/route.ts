import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { sessions } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET — Liste aller Sessions des Users
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id

  const userSessions = await db.select().from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt))

  return NextResponse.json(userSessions)
}

// POST — Neue Session erstellen
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const language = (session.user as any).language || 'de'
  const body = await req.json()
  const { brandName, mode } = body

  if (!brandName) {
    return NextResponse.json({ error: 'brandName ist erforderlich' }, { status: 400 })
  }

  const [newSession] = await db.insert(sessions).values({
    userId,
    brandName,
    language,
    mode: mode || 'creative',
    currentModule: 'verstehen_01',
    status: 'active',
  }).returning()

  return NextResponse.json(newSession)
}
