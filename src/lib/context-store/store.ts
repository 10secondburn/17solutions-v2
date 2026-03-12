import { db } from '@/lib/db/client'
import { contextStore, sessions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { SessionContext, Citation, FactEntry, FactsRegistry, SystemVariables } from './types'
import { createInitialContext } from './types'

const FACTS_MODULE_ID = '_facts_registry'
const SYSTEM_VARS_MODULE_ID = '_system_vars'

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
      // VERSTEHEN
      case 'verstehen_01':
        context.brandProfile = data as any
        break
      case 'verstehen_02':
        context.sdgMapping = data as any
        break
      case 'verstehen_03':
        context.sdgSelection = data as any
        break
      // VALIDIEREN
      case 'validieren_04':
        context.realityCheck = data
        break
      case 'validieren_05':
        context.targetResearch = data
        break
      case 'validieren_06':
        context.dataResearch = data
        break
      // CREATE
      case 'create_07':
        context.springboards = data
        break
      case 'create_08':
        context.partnerships = data
        break
      case 'create_08b':
        context.audienceDesign = data
        break
      case 'create_08c':
        context.marketScope = data
        break
      case 'create_09':
        context.ideaDevelopment = data
        break
      // BEWERTEN
      case 'bewerten_11':
        context.roiEstimation = data
        break
      case 'bewerten_12':
        context.caseBoard = data
        break
      case 'bewerten_13':
        context.executiveSummary = data
        break
    }

    // Citations zum Registry hinzufügen
    context.citationRegistry.push(...citations)
  }

  // Fakten-Registry laden (gespeichert als spezieller Context-Eintrag)
  const factsEntries = contextEntries.filter(e => e.moduleId === FACTS_MODULE_ID)
  if (factsEntries.length > 0) {
    // Neueste Version
    const factsData = factsEntries[0].outputData as { facts?: FactEntry[] }
    if (factsData?.facts) {
      context.factsRegistry = {
        facts: factsData.facts,
        lastUpdated: factsEntries[0].createdAt?.toISOString() || new Date().toISOString(),
      }
    }
  }

  // System-Variablen laden
  const sysVarsEntries = contextEntries.filter(e => e.moduleId === SYSTEM_VARS_MODULE_ID)
  if (sysVarsEntries.length > 0) {
    const sysData = sysVarsEntries[0].outputData as Partial<SystemVariables>
    context.systemVars = {
      ...context.systemVars,
      ...sysData,
    }
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

/**
 * Gibt eine Liste aller Module-IDs zurück, die für diese Session
 * bereits Output im Context Store haben.
 */
export async function getCompletedModules(sessionId: string): Promise<string[]> {
  const entries = await db.select({ moduleId: contextStore.moduleId })
    .from(contextStore)
    .where(eq(contextStore.sessionId, sessionId))

  // Deduplizieren
  return [...new Set(entries.map(e => e.moduleId))]
}

/**
 * Ermittelt das am weitesten fortgeschrittene Modul,
 * basierend auf den vorhandenen Context-Store-Einträgen.
 */
const MODULE_ORDER = [
  'verstehen_01', 'verstehen_02', 'validieren_04', 'verstehen_03',
  'validieren_05', 'create_07', 'create_09', 'create_08',
  'create_08b', 'create_08c', 'validieren_06',
  'bewerten_11', 'bewerten_12', 'bewerten_13',
]

export function getFurthestModule(completedModules: string[], currentModule: string): string {
  let furthestIdx = MODULE_ORDER.indexOf(currentModule)
  for (const moduleId of completedModules) {
    const idx = MODULE_ORDER.indexOf(moduleId)
    if (idx > furthestIdx) furthestIdx = idx
  }
  return MODULE_ORDER[furthestIdx] || currentModule
}

// ============================================================
// Selections — Nutzer-Auswahl zwischen Modulen
// ============================================================

/**
 * Speichert die User-Selektion fuer ein Modul.
 * Nutzt contextStore mit moduleId = "{moduleId}_selection"
 */
export async function saveSelection(params: {
  sessionId: string
  moduleId: string
  selectedItems: (string | number)[]
}) {
  const selectionModuleId = `${params.moduleId}_selection`

  // Vorherige Selektion prüfen
  const existing = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, params.sessionId),
      eq(contextStore.moduleId, selectionModuleId),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  const nextVersion = existing.length > 0 ? (existing[0].version + 1) : 1

  await db.insert(contextStore).values({
    sessionId: params.sessionId,
    moduleId: selectionModuleId,
    outputData: { selectedItems: params.selectedItems },
    citations: [],
    version: nextVersion,
  })
}

/**
 * Lädt alle Selektionen für eine Session.
 * Gibt ein Record<moduleId, selectedItems[]> zurück.
 */
export async function getSelections(sessionId: string): Promise<Record<string, (string | number)[]>> {
  const entries = await db.select().from(contextStore)
    .where(eq(contextStore.sessionId, sessionId))
    .orderBy(desc(contextStore.createdAt))

  const result: Record<string, (string | number)[]> = {}
  const seen = new Set<string>()

  for (const entry of entries) {
    if (!entry.moduleId.endsWith('_selection')) continue
    if (seen.has(entry.moduleId)) continue
    seen.add(entry.moduleId)

    const baseModuleId = entry.moduleId.replace('_selection', '')
    const data = entry.outputData as { selectedItems?: (string | number)[] }
    if (data?.selectedItems) {
      result[baseModuleId] = data.selectedItems
    }
  }

  return result
}

/**
 * Lädt die Selektion für ein bestimmtes Modul.
 */
export async function getModuleSelection(
  sessionId: string,
  moduleId: string
): Promise<(string | number)[] | null> {
  const selectionModuleId = `${moduleId}_selection`

  const [entry] = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, sessionId),
      eq(contextStore.moduleId, selectionModuleId),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  if (!entry) return null
  const data = entry.outputData as { selectedItems?: (string | number)[] }
  return data?.selectedItems || null
}

// ============================================================
// Fakten-Registry — Verifizierte Fakten modul-uebergreifend
// ============================================================

/**
 * Speichert einen oder mehrere verifizierte Fakten.
 * Bestehende Fakten mit gleichem key werden aktualisiert (locked-Flag beachten).
 */
export async function saveVerifiedFacts(params: {
  sessionId: string
  facts: FactEntry[]
}) {
  // Aktuelle Registry laden
  const existing = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, params.sessionId),
      eq(contextStore.moduleId, FACTS_MODULE_ID),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  let currentFacts: FactEntry[] = []
  let nextVersion = 1

  if (existing.length > 0) {
    const data = existing[0].outputData as { facts?: FactEntry[] }
    currentFacts = data?.facts || []
    nextVersion = existing[0].version + 1
  }

  // Merge: Neue Fakten einfuegen oder bestehende updaten
  const factMap = new Map(currentFacts.map(f => [f.key, f]))
  const now = new Date().toISOString()

  for (const newFact of params.facts) {
    const existingFact = factMap.get(newFact.key)
    if (existingFact?.locked && existingFact.value !== newFact.value) {
      // Locked fact darf nicht ueberschrieben werden — logge Warnung
      console.warn(`[FactsRegistry] Versuch, locked Fakt zu aendern: "${newFact.key}" (bestehend: "${existingFact.value}", neu: "${newFact.value}")`)
      continue
    }
    factMap.set(newFact.key, {
      ...newFact,
      factId: existingFact?.factId || newFact.factId || `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: existingFact?.createdAt || now,
      updatedAt: existingFact ? now : undefined,
    })
  }

  const mergedFacts = Array.from(factMap.values())

  await db.insert(contextStore).values({
    sessionId: params.sessionId,
    moduleId: FACTS_MODULE_ID,
    outputData: { facts: mergedFacts },
    citations: [],
    version: nextVersion,
  })
}

/**
 * Lädt die komplette Fakten-Registry fuer eine Session.
 */
export async function getFactsRegistry(sessionId: string): Promise<FactsRegistry> {
  const [entry] = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, sessionId),
      eq(contextStore.moduleId, FACTS_MODULE_ID),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  if (!entry) {
    return { facts: [], lastUpdated: new Date().toISOString() }
  }

  const data = entry.outputData as { facts?: FactEntry[] }
  return {
    facts: data?.facts || [],
    lastUpdated: entry.createdAt?.toISOString() || new Date().toISOString(),
  }
}

/**
 * Sperrt einen Fakt (locked = true), damit er nicht mehr abweichen kann.
 */
export async function lockFact(sessionId: string, factKey: string) {
  const registry = await getFactsRegistry(sessionId)
  const fact = registry.facts.find(f => f.key === factKey)
  if (!fact) return

  fact.locked = true
  fact.updatedAt = new Date().toISOString()

  // Speichere aktualisierte Registry
  const existing = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, sessionId),
      eq(contextStore.moduleId, FACTS_MODULE_ID),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  const nextVersion = existing.length > 0 ? (existing[0].version + 1) : 1

  await db.insert(contextStore).values({
    sessionId,
    moduleId: FACTS_MODULE_ID,
    outputData: { facts: registry.facts },
    citations: [],
    version: nextVersion,
  })
}

// ============================================================
// System-Variablen — Session-weite Konfiguration
// ============================================================

/**
 * Speichert/aktualisiert System-Variablen fuer eine Session.
 */
export async function saveSystemVars(params: {
  sessionId: string
  vars: Partial<SystemVariables>
}) {
  const existing = await db.select().from(contextStore)
    .where(and(
      eq(contextStore.sessionId, params.sessionId),
      eq(contextStore.moduleId, SYSTEM_VARS_MODULE_ID),
    ))
    .orderBy(desc(contextStore.version))
    .limit(1)

  let currentVars: Record<string, unknown> = {}
  let nextVersion = 1

  if (existing.length > 0) {
    currentVars = existing[0].outputData as Record<string, unknown>
    nextVersion = existing[0].version + 1
  }

  await db.insert(contextStore).values({
    sessionId: params.sessionId,
    moduleId: SYSTEM_VARS_MODULE_ID,
    outputData: { ...currentVars, ...params.vars },
    citations: [],
    version: nextVersion,
  })
}
