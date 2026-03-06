import { db } from '@/lib/db/client'
import { contextStore, sessions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { SessionContext, Citation } from './types'
import { createInitialContext } from './types'

/**
 * Context Store — Liest und schreibt strukturierte Phase-Outputs
 */

export async function getSessionContext(sessionId: string): Promise<SessionContext | null> {
  // Lade Session-Grunddaten
  const [session] = await db.select().from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) return null

  // Lade alle Context-Einträge für diese Session
  const contextEntries = await db.select().from(contextStore)
    .where(eq(contextStore.sessionId, sessionId))
    .orderBy(desc(contextStore.createdAt))

  // Baue den Context zusammen
  const context = createInitialContext({
    sessionId: session.id,
    userId: session.userId,
    brandName: session.brandName,
    language: session.language as 'de' | 'en',
    mode: session.mode as 'creative' | 'inspiration',
  })
  context.currentModule = session.currentModule

  // Merge Context-Einträge (neueste Version pro Modul)
  const seen = new Set<string>()
  for (const entry of contextEntries) {
    if (seen.has(entry.moduleId)) continue // Nur neueste Version
    seen.add(entry.moduleId)

    const data = entry.outputData as Record<string, unknown>
    const citations = (entry.citations as Citation[]) || []

    switch (entry.moduleId) {
      case 'verstehen_01':
        context.brandProfile = data as any
        break
      case 'verstehen_02':
        context.sdgMapping = data as any
        break
      case 'verstehen_03':
        context.sdgSelection = data as any
        break
      // Weitere Module in zukünftigen Phasen
    }

    // Citations zum Registry hinzufügen
    context.citationRegistry.push(...citations)
  }

  context.lastUpdated = new Date().toISOString()
  return context
}

export async function saveModuleOutput(params: {
  sessionId: string
  moduleId: string
  outputData: unknown
  citations?: Citation[]
  confidenceScore?: number
}) {
  // Aktuelle Version ermitteln
  const existing = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, params.sessionId),
      eq(contextStore.moduleId, params.moduleId),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  const nextVersion = existing.length > 0 ? (existing[0].version + 1) : 1

  await db.insert(contextStore).values({
    sessionId: params.sessionId,
    moduleId: params.moduleId,
    outputData: params.outputData,
    citations: params.citations || [],
    confidenceScore: params.confidenceScore?.toString(),
    version: nextVersion,
  })

  // Session updaten
  await db.update(sessions)
    .set({ updatedAt: new Date() })
    .where(eq(sessions.id, params.sessionId))
}

export async function advanceModule(sessionId: string, nextModuleId: string) {
  await db.update(sessions)
    .set({
      currentModule: nextModuleId,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
}
