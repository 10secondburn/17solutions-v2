import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { sessions, messages, usageEvents } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

// GET — Einzelne Session laden
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

  const [result] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .limit(1)

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}

// DELETE — Session und alle zugehörigen Daten löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as any).id

  // Nur eigene Sessions löschen
  const [existing] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // usage_events hat KEIN onDelete: 'cascade' — manuell löschen
  await db.delete(usageEvents).where(eq(usageEvents.sessionId, id))

  // Cascade im DB-Schema löscht automatisch:
  // - messages (onDelete: 'cascade')
  // - context_store (onDelete: 'cascade')
  await db.delete(sessions).where(eq(sessions.id, id))

  return NextResponse.json({ success: true })
}

// PATCH — Session aktualisieren (Status, currentModule etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as any).id
  const body = await req.json()

  // Nur eigene Sessions updaten
  const [existing] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.status) updateData.status = body.status
  if (body.currentModule) updateData.currentModule = body.currentModule
  if (body.language) updateData.language = body.language

  const [updated] = await db.update(sessions)
    .set(updateData)
    .where(eq(sessions.id, id))
    .returning()

  return NextResponse.json(updated)
}
