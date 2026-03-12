import type { ConfidenceLevel, SourceType, Language } from '@/types'

// ============================================================
// Citation — Quellenangabe-Objekt (Pflicht in VERSTEHEN + VALIDIEREN)
// ============================================================
export interface Citation {
  sourceId: string
  type: SourceType
  name: string
  detail?: string
  url?: string
  accessedAt?: string // ISO timestamp
  freshness?: 'aktuell' | 'unter_6_monate' | 'unter_1_jahr' | 'ueber_1_jahr'
  confidence?: ConfidenceLevel
  pageOrSection?: string // Bei DOC-Typ
}

// ============================================================
// Fakten-Registry — Verifizierte Fakten, die modul-uebergreifend gelten
// ============================================================

export type FactCategory =
  | 'market_data'      // Marktanteile, Umsatz, Wachstumsraten
  | 'company_data'     // Mitarbeiter, Standorte, Produkte
  | 'sdg_data'         // SDG-spezifische Daten
  | 'timing'           // Zeitfenster, Events, Deadlines
  | 'audience'         // Zielgruppen-Daten
  | 'geographic'       // Markt/Region-Daten
  | 'general'          // Sonstiges

export interface FactEntry {
  factId: string
  key: string                    // z.B. "samsung_halbleiter_marktanteil"
  value: string                  // z.B. "28% globaler Marktanteil (2025)"
  category: FactCategory
  sourceModule: string           // Modul, das diesen Fakt zuerst etabliert hat
  confidence: ConfidenceLevel
  locked: boolean                // true = darf nicht mehr abweichen
  createdAt: string              // ISO timestamp
  updatedAt?: string
}

export interface FactsRegistry {
  facts: FactEntry[]
  lastUpdated: string
}

// ============================================================
// System-Variablen — Gelten fuer die gesamte Session
// ============================================================

export interface SystemVariables {
  currentDate: string            // ISO date, z.B. "2026-03-12"
  currentYear: number
  targetMarket: string           // z.B. "DACH", "Global", "EU"
  language: Language
  mode: 'creative' | 'inspiration'
}

// ============================================================
// Phase-spezifische Output-Typen
// ============================================================

export interface BrandProfile {
  brandName: string
  sector?: string
  positioning: string
  coreValues: string[]
  marketPosition: 'category_leader' | 'challenger' | 'niche' | 'emerging'
  currentSDGActivities: string[]
  culturalMoment: string
  sdgHypothesis: string
  confidenceScore: number
  citations: Citation[]
}

export interface SDGScore {
  sdg: number
  connectionStrength: number
  strategicOpportunity: number
  authenticityRisk: number
  narrativePotential: number
  dataAvailability: number
  rationale: string
  citations: Citation[]
}

export interface SDGMapping {
  scores: SDGScore[]
  topSDGs: number[]
  overallConfidence: number
}

export interface SDGSelection {
  primarySDG: number
  secondarySDGs: number[]
  rationale: string
  strategicNarrative?: string
  userOverrides: string[]
}

// ============================================================
// Vollständiger Context pro Session
// ============================================================
export interface SessionContext {
  sessionId: string
  userId: string
  brandName: string
  language: Language
  mode: 'creative' | 'inspiration'
  currentModule: string

  // VERSTEHEN
  brandProfile?: BrandProfile
  sdgMapping?: SDGMapping
  sdgSelection?: SDGSelection

  // VALIDIEREN (Phase 2)
  realityCheck?: unknown
  targetResearch?: unknown
  dataResearch?: unknown

  // CREATE (Phase 3)
  springboards?: unknown
  partnerships?: unknown
  audienceDesign?: unknown
  marketScope?: unknown
  ideaDevelopment?: unknown

  // BEWERTEN (Phase 4)
  businessImpact?: unknown
  roiEstimation?: unknown
  caseBoard?: unknown
  executiveSummary?: unknown

  // Meta
  citationRegistry: Citation[]
  factsRegistry: FactsRegistry
  systemVars: SystemVariables
  lastUpdated: string
}

export function createInitialContext(params: {
  sessionId: string
  userId: string
  brandName: string
  language: Language
  mode: 'creative' | 'inspiration'
}): SessionContext {
  const now = new Date()
  return {
    ...params,
    currentModule: 'verstehen_01',
    citationRegistry: [],
    factsRegistry: {
      facts: [],
      lastUpdated: now.toISOString(),
    },
    systemVars: {
      currentDate: now.toISOString().split('T')[0],
      currentYear: now.getFullYear(),
      targetMarket: 'DACH', // Default, wird in verstehen_01 ggf. ueberschrieben
      language: params.language,
      mode: params.mode,
    },
    lastUpdated: now.toISOString(),
  }
}
