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
  ideaDevelopment?: unknown

  // BEWERTEN (Phase 4)
  businessImpact?: unknown
  roiEstimation?: unknown

  // Meta
  citationRegistry: Citation[]
  lastUpdated: string
}

export function createInitialContext(params: {
  sessionId: string
  userId: string
  brandName: string
  language: Language
  mode: 'creative' | 'inspiration'
}): SessionContext {
  return {
    ...params,
    currentModule: 'verstehen_01',
    citationRegistry: [],
    lastUpdated: new Date().toISOString(),
  }
}
