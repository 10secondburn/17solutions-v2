import { getSessionContext, saveModuleOutput, advanceModule, getCompletedModules, getFurthestModule, getSelections, saveVerifiedFacts } from '@/lib/context-store/store'
import type { FactEntry, FactsRegistry, SystemVariables } from '@/lib/context-store/types'
import { SELECTION_CONFIGS, getSelectableItems, getDefaultSelection } from './selection-config'
import { loadModule, getNextAvailableModule } from './module-registry'
import { logUsage } from '@/lib/usage/tracker'
import type { OrchestratorRequest } from './types'
import { t } from '@/lib/language/translations'
import type { Language } from '@/types'
import { db } from '@/lib/db/client'
import { messages as messagesTable } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { parseBrandEntryOutput } from '@/modules/verstehen/01-brand-entry/types'
import { parseSDGMappingOutput } from '@/modules/verstehen/02-sdg-mapping/types'
import { parseSDGSelectionOutput } from '@/modules/verstehen/03-sdg-selection/types'
import { parseRealityCheckOutput } from '@/modules/validieren/04-reality-check/types'
import { parseTargetResearchOutput } from '@/modules/validieren/05-target-research/types'
import { parseDataResearchOutput } from '@/modules/validieren/06-data-research/types'
import { parseSpringboardsOutput } from '@/modules/create/07-springboards/types'
import { parsePartnershipsOutput } from '@/modules/create/08-partnerships/types'
import { parseAudienceDesignOutput } from '@/modules/create/08b-audience-design/types'
import { parseIdeaDevelopmentOutput } from '@/modules/create/09-idea-development/types'
import { parseROIEstimationOutput } from '@/modules/bewerten/11-roi-estimation/types'
import { parseCaseBoardOutput } from '@/modules/bewerten/12-case-board/types'
import { parseMarketScopeOutput } from '@/modules/create/08c-market-scope/types'
import { parseExecutiveSummaryOutput } from '@/modules/bewerten/13-executive-summary/types'
import type Anthropic from '@anthropic-ai/sdk'
import { getModelForModule } from '@/lib/models/config'

// ============================================================
// Intent Detection — Unterscheide "weiter" von "weiter eingehen"
// ============================================================

type UserIntent = 'advance' | 'conversation' | 'revisit'

function detectIntent(userInput: string, action?: string): UserIntent {
  // Explizite Actions vom Frontend
  if (action === 'advance') return 'advance'
  if (action === 'revisit') return 'revisit'

  const trimmed = userInput.trim().toLowerCase()

  // NUR explizite, alleinstehende Advance-Phrasen
  // NICHT "weiter" als Substring in einem längeren Satz
  const advancePhrases = [
    'weiter',
    'weiter.',
    'next',
    'next.',
    'continue',
    'continue.',
    'proceed',
    'nächster schritt',
    'naechster schritt',
    'nächste phase',
    'naechste phase',
    'mach weiter',
    'mach weiter.',
    'weiter zum nächsten schritt',
    'weiter zum naechsten schritt',
    'weiter zum nächsten schritt.',
    'weiter zum naechsten schritt.',
    'go to next step',
    'go to next module',
    'let\'s move on',
    'lets move on',
    'lass uns weitergehen',
    'lass uns weitergehen.',
  ]

  // Exakter Match — NICHT .includes()!
  if (advancePhrases.includes(trimmed)) return 'advance'

  // Alles andere ist Konversation
  // "lass uns weiter auf SDG 5 eingehen" → conversation
  // "Persona 3 ist spannend!" → conversation
  // "ich brauche mehr deep dive" → conversation
  return 'conversation'
}

// ============================================================
// Conversation History laden
// ============================================================

// Task 4: Helper to get stepNum from moduleId
function getModuleStepNum(moduleId: string): number {
  // Map moduleIds to their step numbers (NEW FLOW)
  const stepMap: Record<string, number> = {
    'verstehen_01': 1, 'verstehen_02': 2, 'verstehen_03': 3, 'validieren_04': 4,
    'validieren_05': 5, 'create_07': 6, 'create_09': 7, 'create_08': 8,
    'create_08b': 9, 'create_08c': 10, 'validieren_06': 11,
    'bewerten_11': 12, 'bewerten_12': 13, 'bewerten_13': 14,
  }
  return stepMap[moduleId] || 1
}

async function loadConversationHistory(
  sessionId: string,
  moduleId?: string,
): Promise<Anthropic.MessageParam[]> {
  // Task 4: For VALIDIEREN and later modules (step >= 4), reduce limit to 10
  const stepNum = moduleId ? getModuleStepNum(moduleId) : 1
  const limit = stepNum >= 4 ? 10 : 20

  const dbMessages = await db.select().from(messagesTable)
    .where(eq(messagesTable.sessionId, sessionId))
    .orderBy(asc(messagesTable.createdAt))

  // Nur die letzten N Messages (Token-Limits einhalten)
  const recent = dbMessages.slice(-limit)

  // In Anthropic-Format konvertieren
  const messages: Anthropic.MessageParam[] = []
  for (const msg of recent) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  // Anthropic erwartet abwechselnde User/Assistant Messages
  const consolidated: Anthropic.MessageParam[] = []
  for (const msg of messages) {
    const last = consolidated[consolidated.length - 1]
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n\n${msg.content}`
    } else {
      consolidated.push({ ...msg })
    }
  }

  // Muss mit 'user' beginnen
  while (consolidated.length > 0 && consolidated[0].role !== 'user') {
    consolidated.shift()
  }

  return consolidated
}

// ============================================================
// Context-Summary für den System Prompt
// ============================================================

function buildContextSummary(context: any, lang: Language, selections?: Record<string, (string | number)[]>): string {
  const parts: string[] = []
  const sel = selections || {}
  const de = lang === 'de'

  // ============================================================
  // BLOCK 1: SYSTEM-VARIABLEN (immer ganz oben)
  // ============================================================
  if (context.systemVars) {
    const sv = context.systemVars as SystemVariables
    parts.push(de
      ? `--- SYSTEM-VARIABLEN ---\nDatum: ${sv.currentDate} | Jahr: ${sv.currentYear} | Zielmarkt: ${sv.targetMarket} | Sprache: ${sv.language} | Modus: ${sv.mode}`
      : `--- SYSTEM VARIABLES ---\nDate: ${sv.currentDate} | Year: ${sv.currentYear} | Target market: ${sv.targetMarket} | Language: ${sv.language} | Mode: ${sv.mode}`)
  }

  // ============================================================
  // BLOCK 2: VERIFIZIERTE FAKTEN (locked facts = Pflicht)
  // ============================================================
  const factsRegistry = context.factsRegistry as FactsRegistry | undefined
  if (factsRegistry?.facts && factsRegistry.facts.length > 0) {
    const factsBlock: string[] = []
    factsBlock.push(de
      ? '--- VERIFIZIERTE FAKTEN (NICHT ABWEICHEN!) ---'
      : '--- VERIFIED FACTS (DO NOT DEVIATE!) ---')

    // Gruppiert nach Kategorie
    const byCategory = new Map<string, FactEntry[]>()
    for (const fact of factsRegistry.facts) {
      const cat = fact.category || 'general'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(fact)
    }

    for (const [category, facts] of byCategory) {
      const catLabel = de
        ? { market_data: 'Marktdaten', company_data: 'Unternehmensdaten', sdg_data: 'SDG-Daten', timing: 'Timing', audience: 'Zielgruppen', geographic: 'Geografie', general: 'Allgemein' }[category] || category
        : category.replace('_', ' ').toUpperCase()
      factsBlock.push(`[${catLabel}]`)
      for (const f of facts) {
        const lockIcon = f.locked ? ' 🔒' : ''
        factsBlock.push(`• ${f.key}: ${f.value}${lockIcon} (Quelle: ${f.sourceModule}, Konfidenz: ${f.confidence})`)
      }
    }

    parts.push(factsBlock.join('\n'))
  }

  // ============================================================
  // BLOCK 3: BISHERIGE ERGEBNISSE (gefiltert durch Selektionen)
  // ============================================================
  parts.push(de ? '--- BISHERIGE ERGEBNISSE ---' : '--- PREVIOUS RESULTS ---')

  if (context.brandProfile) {
    const bp = context.brandProfile
    parts.push(de
      ? `MARKEN-PROFIL: ${bp.brandName} | Sektor: ${bp.sector || 'n/a'} | Positionierung: ${bp.positioning} | Werte: ${(bp.coreValues || []).join(', ')} | Marktposition: ${bp.marketPosition}`
      : `BRAND PROFILE: ${bp.brandName} | Sector: ${bp.sector || 'n/a'} | Positioning: ${bp.positioning} | Values: ${(bp.coreValues || []).join(', ')} | Market position: ${bp.marketPosition}`)
  }

  if (context.sdgMapping) {
    const selected = sel['verstehen_02']
    if (selected && selected.length > 0) {
      const scores = context.sdgMapping.scores || []
      const filtered = scores.filter((s: any) => selected.includes(s.sdg))
      if (filtered.length > 0) {
        const summary = filtered.map((s: any) => `SDG ${s.sdg} (Strength ${s.connectionStrength}/10, Opportunity ${s.strategicOpportunity}/10)`).join(', ')
        parts.push(de
          ? `SDG-MAPPING [AUSWAHL — NUR DIESE SDGs WEITERVERFOLGEN]: ${summary}`
          : `SDG MAPPING [SELECTION — ONLY PURSUE THESE SDGs]: ${summary}`)
      }
    } else {
      parts.push(de
        ? `SDG-MAPPING: Analyse aller 17 SDGs liegt vor.`
        : `SDG MAPPING: Analysis of all 17 SDGs available.`)
    }
  }

  if (context.realityCheck) {
    const rc = context.realityCheck
    parts.push(de
      ? `REALITAETS-CHECK: Chancen und Huerden validiert.${rc.keyFindings ? ` Key Findings: ${rc.keyFindings}` : ''}`
      : `REALITY CHECK: Opportunities and hurdles validated.${rc.keyFindings ? ` Key Findings: ${rc.keyFindings}` : ''}`)
  }

  if (context.sdgSelection) {
    const ss = context.sdgSelection
    parts.push(de
      ? `SDG-AUSWAHL [VERBINDLICH]: Primäres SDG ${ss.primarySDG} | Sekundäre: ${(ss.secondarySDGs || []).join(', ')} | Rationale: ${ss.rationale}${ss.strategicNarrative ? ` | Narrativ: ${ss.strategicNarrative}` : ''}`
      : `SDG SELECTION [BINDING]: Primary SDG ${ss.primarySDG} | Secondary: ${(ss.secondarySDGs || []).join(', ')} | Rationale: ${ss.rationale}${ss.strategicNarrative ? ` | Narrative: ${ss.strategicNarrative}` : ''}`)
  }

  if (context.targetResearch) {
    const selected = sel['validieren_05']
    if (selected && selected.length > 0) {
      const protagonists = context.targetResearch.protagonists || []
      const filtered = protagonists.filter((p: any) => selected.includes(p.name))
      if (filtered.length > 0) {
        // Vollstaendige Protagonist-Daten mitgeben, nicht nur Name
        const summary = filtered.map((p: any) =>
          `${p.name}: ${p.realProblem || ''} | Relevanz: ${p.relevanceScore || 'n/a'}`
        ).join(' | ')
        parts.push(de
          ? `PROTAGONISTEN [AUSWAHL — ALLE MUESSEN BERUECKSICHTIGT WERDEN]: ${summary}`
          : `PROTAGONISTS [SELECTION — ALL MUST BE CONSIDERED]: ${summary}`)
      }
    } else {
      parts.push(de ? 'PROTAGONISTEN-SEARCH: Ergebnisse liegen vor.' : 'PROTAGONIST SEARCH: Results available.')
    }
  }

  if (context.springboards) {
    const selected = sel['create_07']
    if (selected && selected.length > 0) {
      const sbs = context.springboards.springboards || []
      const filtered = sbs.filter((s: any) => selected.includes(s.headline))
      if (filtered.length > 0) {
        const summary = filtered.map((s: any) => `"${s.headline}": ${s.description || ''}`).join(' | ')
        parts.push(de
          ? `SPRINGBOARDS [AUSWAHL — DARAUF AUFBAUEN]: ${summary}`
          : `SPRINGBOARDS [SELECTION — BUILD ON THESE]: ${summary}`)
      }
    } else {
      parts.push(de ? 'SPRINGBOARDS: Kreative Sprungbretter liegen vor.' : 'SPRINGBOARDS: Available.')
    }
  }

  if (context.ideaDevelopment) {
    const selected = sel['create_09']
    if (selected && selected.length > 0) {
      const ideas = context.ideaDevelopment.ideas || []
      const filtered = ideas.filter((i: any) => selected.includes(i.ideaType))
      if (filtered.length > 0) {
        const summary = filtered.map((i: any) =>
          `${i.ideaType}: ${i.headline || i.title || ''} — ${i.description || ''}`
        ).join(' | ')
        parts.push(de
          ? `IDEEN [AUSWAHL — DIESE WEITERENTWICKELN]: ${summary}`
          : `IDEAS [SELECTION — DEVELOP THESE]: ${summary}`)
      }
    } else {
      parts.push(de ? 'IDEEN-ENTWICKLUNG: 5 Konzepte liegen vor.' : 'IDEA DEVELOPMENT: 5 concepts available.')
    }
  }

  if (context.partnerships) {
    const selected = sel['create_08']
    if (selected && selected.length > 0) {
      const partners = context.partnerships.partnerships || []
      const filtered = partners.filter((p: any) => selected.includes(p.partnerName))
      if (filtered.length > 0) {
        const summary = filtered.map((p: any) => `${p.partnerName} (${p.partnerType}): ${p.rationale || ''}`).join(' | ')
        parts.push(de
          ? `PARTNERSCHAFTEN [AUSWAHL]: ${summary}`
          : `PARTNERSHIPS [SELECTION]: ${summary}`)
      }
    } else {
      parts.push(de ? 'PARTNERSCHAFTEN: Strategie liegt vor.' : 'PARTNERSHIPS: Strategy available.')
    }
  }

  if (context.audienceDesign) {
    const selected = sel['create_08b']
    if (selected && selected.length > 0) {
      const audiences = context.audienceDesign.audiences || []
      const filtered = audiences.filter((a: any) => selected.includes(a.name))
      if (filtered.length > 0) {
        const summary = filtered.map((a: any) =>
          `${a.name}: ${a.description || a.insight || ''}`
        ).join(' | ')
        parts.push(de
          ? `ZIELPUBLIKUM [AUSWAHL — ALLE MUESSEN IN DER KAMPAGNE VORKOMMEN]: ${summary}`
          : `AUDIENCE [SELECTION — ALL MUST APPEAR IN CAMPAIGN]: ${summary}`)
      }
    } else {
      parts.push(de ? 'ZIELPUBLIKUM: Liegt vor.' : 'AUDIENCE DESIGN: Available.')
    }
  }

  if (context.marketScope) {
    const ms = context.marketScope as any
    parts.push(de
      ? `MARKT [VERBINDLICH]: ${ms.primaryMarket} (${ms.scale}) | Regionen: ${(ms.regions || []).join(', ')}`
      : `MARKET [BINDING]: ${ms.primaryMarket} (${ms.scale}) | Regions: ${(ms.regions || []).join(', ')}`)
  }

  if (context.dataResearch) {
    const selected = sel['validieren_06']
    if (selected && selected.length > 0 && context.dataResearch.timingWindows) {
      const windows = context.dataResearch.timingWindows || []
      const filtered = windows.filter((tw: any) => selected.includes(tw.name))
      if (filtered.length > 0) {
        const summary = filtered.map((tw: any) => `${tw.name} (${tw.date}): ${tw.description || ''}`).join(' | ')
        parts.push(de
          ? `EREIGNISSE [AUSWAHL]: ${summary}`
          : `EVENTS [SELECTION]: ${summary}`)
      }
    } else {
      parts.push(de ? 'EREIGNISSE: Timing-Fenster liegen vor.' : 'EVENTS: Timing windows available.')
    }
  }

  if (context.roiEstimation) {
    parts.push(de
      ? `ROI-SCHAETZUNG & BUSINESS IMPACT: Szenarien und Auswirkungen analysiert.`
      : `ROI ESTIMATION & BUSINESS IMPACT: Scenarios and impact analyzed.`)
  }

  if (context.caseBoard) parts.push(de ? 'CASE BOARD: Visuelles Board liegt vor.' : 'CASE BOARD: Visual board available.')

  return parts.join('\n')
}

// ============================================================
// Trigger Messages (nur bei auto-advance)
// ============================================================

function getTriggerMessage(moduleId: string, context: any, lang: Language): string {
  const brand = context.brandName || 'die Marke'
  const triggers: Record<string, Record<string, string>> = {
    'verstehen_02': {
      de: `Analysiere die Marke ${brand} und erstelle ein SDG-Mapping. Bewerte alle 17 SDGs.`,
      en: `Analyze the brand ${brand} and create an SDG mapping. Score all 17 SDGs.`,
    },
    'validieren_04': {
      de: `Fuehre einen Reality Check fuer ${brand} durch, basierend auf dem SDG-Mapping. Validiere die realistischen Chancen und Huerden.`,
      en: `Conduct a Reality Check for ${brand} based on the SDG mapping. Validate realistic opportunities and hurdles.`,
    },
    'verstehen_03': {
      de: `Basierend auf dem SDG-Mapping und dem Reality Check, gib eine klare Empfehlung, welche SDGs ${brand} verfolgen sollte. Beruecksichtige sowohl die Staerken als auch die realistische Machbarkeit.`,
      en: `Based on the SDG mapping and Reality Check, give a clear recommendation which SDGs ${brand} should pursue. Consider both strengths and realistic feasibility.`,
    },
    'validieren_05': {
      de: `Finde ueberraschende Protagonisten und Problemfelder innerhalb der SDG-Strategie von ${brand}.`,
      en: `Find surprising protagonists and problem fields within ${brand}'s SDG strategy.`,
    },
    'create_07': {
      de: `Entwickle kreative Springboards fuer ${brand}.`,
      en: `Develop creative springboards for ${brand}.`,
    },
    'create_09': {
      de: `Entwickle 5 unterschiedliche Ideen-Typen fuer ${brand}: (1) Kampagne, (2) Aktivierung, (3) Stunt, (4) Experience, (5) Wildcard. Nutze die Springboards als Ausgangspunkt.`,
      en: `Develop 5 different idea types for ${brand}: (1) Campaign, (2) Activation, (3) Stunt, (4) Experience, (5) Wildcard. Use the springboards as a starting point.`,
    },
    'create_08': {
      de: `Identifiziere strategische Partnerschaften fuer die ausgewaehlte Idee von ${brand}. Welche Partner wuerden diese Idee am besten realisieren?`,
      en: `Identify strategic partnerships for ${brand}'s chosen idea. Which partners would realize this idea best?`,
    },
    'create_08b': {
      de: `Definiere das Zielpublikum fuer die Idee von ${brand}. Wer erlebt die Geschichte und hat Handlungsmacht?`,
      en: `Define the target audience for ${brand}'s idea. Who experiences the story and has agency to act?`,
    },
    'create_08c': {
      de: `Definiere den Markt fuer die Idee von ${brand}. In welchem geografischen Raum soll die Kampagne wirken?`,
      en: `Define the market for ${brand}'s idea. In which geographic scope should the campaign operate?`,
    },
    'validieren_06': {
      de: `Recherchiere Ereignisse und Timing-Fenster fuer die Kampagne von ${brand}. Wann gibt es ideale Chancen, die Kampagne zu launchen, die mit den SDGs und der Idee verknuepft sind?`,
      en: `Research events and timing windows for ${brand}'s campaign. When are there ideal opportunities to launch the campaign tied to the SDGs and the idea?`,
    },
    'bewerten_11': {
      de: `Erstelle eine ROI-Schaetzung und Business Impact Analyse fuer die Kampagne von ${brand}. Beruecksichtige finanzielle Szenarien und gesellschaftliche Auswirkungen.`,
      en: `Create an ROI estimation and Business Impact analysis for ${brand}'s campaign. Consider financial scenarios and societal impact.`,
    },
    'bewerten_12': {
      de: `Erstelle das finale Case Board fuer ${brand}.`,
      en: `Create the final Case Board for ${brand}.`,
    },
    'bewerten_13': {
      de: `Erstelle die Executive Summary fuer ${brand}. Fasse alle Phasen und Module zusammen.`,
      en: `Create the Executive Summary for ${brand}. Summarize all phases and modules.`,
    },
  }
  const t = triggers[moduleId]
  return t ? (t[lang] || t['de']) : ''
}

// ============================================================
// Output Parser
// ============================================================

function parseModuleOutput(moduleId: string, text: string): { data: any; confidence?: number } | null {
  const parsers: Record<string, (t: string) => any> = {
    'verstehen_01': parseBrandEntryOutput,
    'verstehen_02': parseSDGMappingOutput,
    'verstehen_03': parseSDGSelectionOutput,
    'validieren_04': parseRealityCheckOutput,
    'validieren_05': parseTargetResearchOutput,
    'validieren_06': parseDataResearchOutput,
    'create_07': parseSpringboardsOutput,
    'create_08': parsePartnershipsOutput,
    'create_08b': parseAudienceDesignOutput,
    'create_08c': parseMarketScopeOutput,
    'create_09': parseIdeaDevelopmentOutput,
    'bewerten_11': parseROIEstimationOutput,
    'bewerten_12': parseCaseBoardOutput,
    'bewerten_13': parseExecutiveSummaryOutput,
  }
  const parser = parsers[moduleId]
  if (!parser) {
    console.warn(`[Parser] Kein Parser fuer Modul ${moduleId}`)
    return null
  }

  try {
    const data = parser(text)
    if (!data) {
      console.warn(`[Parser] Parser fuer ${moduleId} gab null zurueck. Text-Laenge: ${text.length}`)
      // Fallback: Versuche generische JSON-Extraktion
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const fallback = JSON.parse(jsonMatch[1].trim())
          console.log(`[Parser] Fallback-JSON erfolgreich fuer ${moduleId}`)
          return { data: fallback, confidence: fallback.confidenceScore }
        } catch (e) {
          console.warn(`[Parser] Fallback-JSON fehlgeschlagen fuer ${moduleId}:`, e)
        }
      }
      return null
    }
    return { data, confidence: data.confidenceScore }
  } catch (err) {
    console.error(`[Parser] Fehler beim Parsen von ${moduleId}:`, err)
    return null
  }
}

// ============================================================
// Fakten-Extraktion — Automatisch aus Modul-Outputs
// ============================================================

function extractFactsFromOutput(moduleId: string, data: any): FactEntry[] {
  const facts: FactEntry[] = []
  const now = new Date().toISOString()

  function makeFact(key: string, value: string, category: FactEntry['category'], locked = false): FactEntry {
    return {
      factId: `fact_${moduleId}_${key}`,
      key,
      value,
      category,
      sourceModule: moduleId,
      confidence: 'PLAUSIBEL',
      locked,
      createdAt: now,
    }
  }

  switch (moduleId) {
    case 'verstehen_01': {
      // Brand Entry — Kern-Unternehmensdaten fixieren
      if (data.brandName) facts.push(makeFact('brand_name', data.brandName, 'company_data', true))
      if (data.sector) facts.push(makeFact('brand_sector', data.sector, 'company_data', true))
      if (data.marketPosition) facts.push(makeFact('brand_market_position', data.marketPosition, 'company_data'))
      if (data.positioning) facts.push(makeFact('brand_positioning', data.positioning, 'company_data'))
      if (data.coreValues?.length) facts.push(makeFact('brand_core_values', data.coreValues.join(', '), 'company_data'))
      break
    }

    case 'verstehen_02': {
      // SDG Mapping — Top-SDGs als Fakten
      if (data.topSDGs?.length) {
        facts.push(makeFact('sdg_top_sdgs', data.topSDGs.join(', '), 'sdg_data'))
      }
      break
    }

    case 'verstehen_03': {
      // SDG Selection — Verbindliche Auswahl
      if (data.primarySDG) facts.push(makeFact('sdg_primary', String(data.primarySDG), 'sdg_data', true))
      if (data.secondarySDGs?.length) facts.push(makeFact('sdg_secondary', data.secondarySDGs.join(', '), 'sdg_data', true))
      break
    }

    case 'validieren_04': {
      // Reality Check — Kern-Erkenntnisse
      if (data.keyFindings) facts.push(makeFact('reality_check_findings', data.keyFindings, 'general'))
      // Spezifische Zahlen/Daten aus dem Reality Check extrahieren
      if (data.marketData) {
        for (const [key, value] of Object.entries(data.marketData)) {
          if (typeof value === 'string' || typeof value === 'number') {
            facts.push(makeFact(`market_${key}`, String(value), 'market_data', true))
          }
        }
      }
      break
    }

    case 'create_08c': {
      // Market Scope — Zielmarkt fixieren
      if (data.primaryMarket) facts.push(makeFact('target_market', data.primaryMarket, 'geographic', true))
      if (data.scale) facts.push(makeFact('market_scale', data.scale, 'geographic'))
      if (data.regions?.length) facts.push(makeFact('market_regions', data.regions.join(', '), 'geographic'))
      break
    }

    case 'validieren_06': {
      // Events/Timing — Timing-Fenster
      if (data.timingWindows?.length) {
        const summary = data.timingWindows.map((tw: any) => `${tw.name} (${tw.date})`).join('; ')
        facts.push(makeFact('timing_windows', summary, 'timing'))
      }
      break
    }
  }

  return facts
}

// ============================================================
// Agent-Orchestrator — Streaming (Conversational)
//
// SSE-Events:
//   data: {"type":"token","text":"..."}
//   data: {"type":"module","currentModule":"...","nextModule":"...","advanced":bool}
//   data: {"type":"done","fullText":"...","advanced":bool}
//   data: {"type":"error","message":"..."}
// ============================================================

export function executeOrchestratorStream(
  request: OrchestratorRequest,
  userId: string,
): ReadableStream {
  const encoder = new TextEncoder()

  function sendEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
  }

  return new ReadableStream({
    async start(controller) {
      try {
        // 1. Context laden
        const context = await getSessionContext(request.sessionId)
        if (!context) {
          controller.enqueue(sendEvent({ type: 'error', message: 'Session not found' }))
          controller.close()
          return
        }

        const lang = context.language as Language

        // 1b. System-Variablen aktualisieren (Datum immer aktuell)
        const now = new Date()
        context.systemVars = {
          ...context.systemVars,
          currentDate: now.toISOString().split('T')[0],
          currentYear: now.getFullYear(),
          language: lang,
          mode: context.mode || 'creative',
        }

        // 2. Intent erkennen — SMART, nicht keyword-basiert
        const intent = detectIntent(request.userInput, request.action)
        let didAdvance = false
        let didRevisit = false

        // 3a. Bei REVISIT: zu einem vorherigen Modul zurückkehren
        if (intent === 'revisit' && request.targetModule) {
          const targetId = request.targetModule
          // Prüfe ob das Modul existiert und geladen werden kann
          const targetModule = await loadModule(targetId)
          if (targetModule) {
            await advanceModule(request.sessionId, targetId)
            context.currentModule = targetId
            didRevisit = true
          } else {
            controller.enqueue(sendEvent({ type: 'error', message: `Modul ${targetId} nicht verfügbar.` }))
            controller.close()
            return
          }
        }

        // 3b. Bei ADVANCE: zum nächsten Modul wechseln
        if (intent === 'advance') {
          const nextModule = getNextAvailableModule(context.currentModule)
          if (nextModule) {
            await advanceModule(request.sessionId, nextModule)
            context.currentModule = nextModule
            didAdvance = true
          } else {
            controller.enqueue(sendEvent({ type: 'token', text: t('chat.comingSoon', lang) }))
            controller.enqueue(sendEvent({ type: 'done' }))
            controller.close()
            return
          }
        }

        // 4. Modul laden
        const moduleExecutor = await loadModule(context.currentModule)
        if (!moduleExecutor) {
          controller.enqueue(sendEvent({ type: 'token', text: t('chat.comingSoon', lang) }))
          controller.enqueue(sendEvent({ type: 'done' }))
          controller.close()
          return
        }

        // 5. Completed Modules ermitteln + furthestModule berechnen
        const completedModules = await getCompletedModules(request.sessionId)
        const furthestModule = getFurthestModule(completedModules, context.currentModule)

        // 6. Modul-Info senden
        controller.enqueue(sendEvent({
          type: 'module',
          currentModule: context.currentModule,
          nextModule: getNextAvailableModule(context.currentModule),
          advanced: didAdvance,
          revisited: didRevisit,
          completedModules,
          furthestModule,
        }))

        // 7. Konversationshistorie laden
        const conversationHistory = await loadConversationHistory(request.sessionId, context.currentModule)

        // 8. User-Input bestimmen
        // Selektionen laden fuer Context-Filterung
        const selections = await getSelections(request.sessionId)
        const contextSummary = buildContextSummary(context, lang, selections)
        let finalUserInput: string

        if (didAdvance) {
          // Advance: Trigger-Message + Context
          const trigger = getTriggerMessage(context.currentModule, context, lang)
          finalUserInput = contextSummary
            ? `${trigger}\n\n--- BISHERIGER KONTEXT ---\n${contextSummary}`
            : trigger
        } else if (didRevisit) {
          // Revisit: User will ein vorheriges Modul neu bearbeiten
          // Zeige was bisher erarbeitet wurde + was der User ändern will
          const revisitIntro = lang === 'de'
            ? `Der User ist zu diesem Modul zurückgekehrt, um die bisherigen Ergebnisse zu überarbeiten oder zu vertiefen. Berücksichtige die bisherigen Ergebnisse und gehe auf den Wunsch des Users ein.`
            : `The user has returned to this module to revise or deepen the previous results. Consider the existing results and address the user's request.`
          finalUserInput = contextSummary
            ? `${revisitIntro}\n\nUser: ${request.userInput}\n\n--- BISHERIGE ERGEBNISSE ---\n${contextSummary}`
            : `${revisitIntro}\n\nUser: ${request.userInput}`
        } else {
          // Konversation: ECHTER User-Input + Context als Hintergrund
          finalUserInput = contextSummary
            ? `${request.userInput}\n\n--- HINTERGRUND (bisherige Analyse-Ergebnisse) ---\n${contextSummary}`
            : request.userInput
        }

        // 8. Messages zusammenbauen
        let apiMessages: Anthropic.MessageParam[]

        if (didAdvance || didRevisit) {
          // Neues Modul oder Revisit: Frischer Start mit Context
          apiMessages = [{ role: 'user', content: finalUserInput }]
        } else {
          // Konversation: History einbeziehen
          if (conversationHistory.length > 1) {
            // Letzte User-Message entfernen (ist unser aktueller Input, schon in DB)
            const history = [...conversationHistory]
            if (history[history.length - 1]?.role === 'user') {
              history.pop()
            }
            apiMessages = [
              ...history,
              { role: 'user', content: finalUserInput },
            ]
            // Muss mit 'user' beginnen
            while (apiMessages.length > 0 && apiMessages[0].role !== 'user') {
              apiMessages.shift()
            }
          } else {
            apiMessages = [{ role: 'user', content: finalUserInput }]
          }
        }

        // 9. executeStream mit Konversations-Messages
        // Übergebe die Messages im enriched context
        const enrichedContext = {
          ...context,
          _conversationMessages: apiMessages,
        }

        if (moduleExecutor.executeStream) {
          const stream = await moduleExecutor.executeStream(enrichedContext, finalUserInput)
          let fullText = ''

          stream.on('text', (text: string) => {
            fullText += text
            controller.enqueue(sendEvent({ type: 'token', text }))
          })

          const finalMessage = await stream.finalMessage()

          // Task 2: Check for truncation (max_tokens reached)
          if (finalMessage.stop_reason === 'max_tokens') {
            const hasJsonBlock = /```json\s*[\s\S]*?```/.test(fullText)
            console.warn(`[WARN] Module ${context.currentModule} response was TRUNCATED (max_tokens reached)`)
            console.warn(`[WARN] Response length: ${fullText.length}, JSON block found: ${hasJsonBlock}`)
          }

          const tokenUsage = {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            model: getModelForModule(context.currentModule),
          }

          // Output parsen und speichern
          const parsed = parseModuleOutput(context.currentModule, fullText)
          if (parsed) {
            await saveModuleOutput({
              sessionId: request.sessionId,
              moduleId: context.currentModule,
              outputData: parsed.data,
              citations: [{
                sourceId: `src_${context.currentModule}_ki`,
                type: 'KI',
                name: 'Claude Sonnet 4 — Analysis',
              }],
              confidenceScore: parsed.confidence,
            })

            // Automatische Fakten-Extraktion aus Modul-Output
            const extractedFacts = extractFactsFromOutput(context.currentModule, parsed.data)
            if (extractedFacts.length > 0) {
              await saveVerifiedFacts({
                sessionId: request.sessionId,
                facts: extractedFacts,
              })
              console.log(`[Facts] ${extractedFacts.length} Fakten aus ${context.currentModule} extrahiert`)
            }
          }

          logUsage({
            userId,
            sessionId: request.sessionId,
            moduleId: context.currentModule,
            usage: tokenUsage,
          }).catch(console.error)

          // Nach Speicherung: aktualisierte completedModules senden
          const updatedCompleted = await getCompletedModules(request.sessionId)
          const updatedFurthest = getFurthestModule(updatedCompleted, context.currentModule)

          // Selection-Items direkt im Event mitschicken (Frontend braucht keinen extra Fetch)
          // WICHTIG: Extraktion ist unabhaengig vom typed Parser — direkt aus fullText
          let selectionData: any = undefined
          const selCfg = SELECTION_CONFIGS[context.currentModule]
          if (selCfg) {
            console.log(`[Selection] Config fuer ${context.currentModule}: property=${selCfg.selectableProperty}`)

            // Versuch 1: Aus parsed data (typed parser)
            let sourceData = parsed?.data || null

            // Versuch 2: Direkt aus fullText (typed parser umgehen)
            if (!sourceData || !sourceData[selCfg.selectableProperty]) {
              console.log(`[Selection] Typed parser lieferte keine ${selCfg.selectableProperty}, versuche direkte Extraktion`)
              try {
                const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/)
                if (jsonMatch) {
                  sourceData = JSON.parse(jsonMatch[1].trim())
                  console.log(`[Selection] Direkte JSON-Extraktion erfolgreich. Keys:`, Object.keys(sourceData))
                } else {
                  console.warn(`[Selection] Kein JSON-Block in fullText gefunden. fullText-Laenge: ${fullText.length}, letzte 200 Zeichen:`, fullText.slice(-200))
                }
              } catch (e) {
                console.error(`[Selection] JSON-Parse-Fehler:`, e)
              }
            }

            if (sourceData) {
              const rawItems = sourceData[selCfg.selectableProperty]
              console.log(`[Selection] sourceData[${selCfg.selectableProperty}] =`, Array.isArray(rawItems) ? `Array(${rawItems.length})` : typeof rawItems)

              if (Array.isArray(rawItems) && rawItems.length > 0) {
                // Zentrale Default-Berechnung nutzen (AI-Empfehlung > Score > Reihenfolge)
                const defaults = getDefaultSelection(context.currentModule, sourceData)
                selectionData = {
                  items: rawItems,
                  defaults,
                }
                console.log(`[Selection] ERFOLG: ${rawItems.length} items, defaults:`, selectionData.defaults)
              }
            }

            if (!selectionData) {
              console.error(`[Selection] FEHLER: Keine Selection-Items fuer ${context.currentModule} extrahierbar`)
            }
          }

          controller.enqueue(sendEvent({
            type: 'done',
            fullText,
            currentModule: context.currentModule,
            advanced: didAdvance,
            revisited: didRevisit,
            completedModules: updatedCompleted,
            furthestModule: updatedFurthest,
            selectionData,
          }))
        } else {
          // Fallback: nicht-streaming
          const result = await moduleExecutor.execute(context, finalUserInput)

          controller.enqueue(sendEvent({ type: 'token', text: result.response }))

          if (result.outputData) {
            await saveModuleOutput({
              sessionId: request.sessionId,
              moduleId: context.currentModule,
              outputData: result.outputData,
              citations: result.citations as any,
              confidenceScore: result.confidenceScore,
            })
          }

          logUsage({
            userId,
            sessionId: request.sessionId,
            moduleId: context.currentModule,
            usage: result.tokenUsage,
          }).catch(console.error)

          const updatedCompleted2 = await getCompletedModules(request.sessionId)
          const updatedFurthest2 = getFurthestModule(updatedCompleted2, context.currentModule)

          // Selection-Items direkt im Event mitschicken
          let selectionData2: any = undefined
          const selCfg2 = SELECTION_CONFIGS[context.currentModule]
          if (selCfg2) {
            let sourceData2 = result.outputData || null
            if (!sourceData2 || !sourceData2[selCfg2.selectableProperty]) {
              try {
                const jsonMatch2 = result.response.match(/```json\s*([\s\S]*?)```/)
                if (jsonMatch2) sourceData2 = JSON.parse(jsonMatch2[1].trim())
              } catch {}
            }
            if (sourceData2) {
              const rawItems2 = sourceData2[selCfg2.selectableProperty]
              if (Array.isArray(rawItems2) && rawItems2.length > 0) {
                selectionData2 = {
                  items: rawItems2,
                  defaults: getDefaultSelection(context.currentModule, sourceData2),
                }
              }
            }
          }

          controller.enqueue(sendEvent({
            type: 'done',
            fullText: result.response,
            currentModule: context.currentModule,
            advanced: didAdvance,
            revisited: didRevisit,
            completedModules: updatedCompleted2,
            furthestModule: updatedFurthest2,
            selectionData: selectionData2,
          }))
        }

        controller.close()
      } catch (error: any) {
        console.error('Orchestrator stream error:', error)
        controller.enqueue(sendEvent({
          type: 'error',
          message: error.status === 429
            ? 'Rate limit — bitte kurz warten.'
            : (error.message || 'Ein Fehler ist aufgetreten.'),
        }))
        controller.close()
      }
    },
  })
}
