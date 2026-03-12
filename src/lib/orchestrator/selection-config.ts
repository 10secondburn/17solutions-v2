// ============================================================
// Selection Config: Definiert welche Module Auswahl-UI zeigen
// ============================================================

export interface SelectionConfig {
  /** Key im parsed output der die Items enthaelt */
  selectableProperty: string
  /** single = Radio, multiple = Checkbox */
  mode: 'single' | 'multiple'
  /** Max. Anzahl auswaehlbarer Items (0 = unbegrenzt) */
  maxSelections: number
  /** Feld-Name fuer die Item-ID (muss unique pro Item sein) */
  itemId: string
  /** Feld-Name fuer das Label */
  itemLabel: string
  /** Feld-Name fuer Kurzbeschreibung (optional) */
  itemDescription?: string
  /** Feld-Name fuer Score-Anzeige (optional, 0-10) */
  itemScore?: string
  /** Zweiter Score (optional) */
  itemScoreSecondary?: string
  /** Score-Labels fuer UI */
  scoreLabel?: string
  scoreLabelSecondary?: string
  /** Wieviele Items per Default vorausgewaehlt (Top N nach Score) */
  defaultCount: number
  /** Auswahl-Frage DE */
  promptDE: string
  /** Auswahl-Frage EN */
  promptEN: string
  /**
   * AI-Empfehlungs-Felder: Wenn vorhanden, werden diese statt Score-Sortierung
   * fuer die Default-Auswahl genutzt. Die AI hat in ihrem Output explizit empfohlen,
   * welche Items priorisiert werden sollen.
   *
   * Kann ein einzelnes Feld sein (z.B. 'recommended') das ein Array von IDs liefert,
   * oder mehrere Felder die zusammengefuehrt werden (z.B. primarySDG + secondarySDGs).
   */
  aiRecommendedFields?: {
    /** Feld(er) im Output deren Werte als Default-IDs genutzt werden */
    fields: string[]
    /** Wie die Werte zusammengefuehrt werden: 'concat' (flatten arrays) oder 'direct' (einzelwerte) */
    mode: 'concat' | 'direct'
  }
}

export const SELECTION_CONFIGS: Record<string, SelectionConfig> = {
  // SDG Selection: Welche SDGs sollen priorisiert werden?
  // AI empfiehlt primarySDG + secondarySDGs — das sind die Defaults
  'verstehen_03': {
    selectableProperty: 'scores',
    mode: 'multiple',
    maxSelections: 5,
    itemId: 'sdg',
    itemLabel: 'name',
    itemDescription: 'rationale',
    itemScore: 'connectionStrength',
    itemScoreSecondary: 'narrativePotential',
    scoreLabel: 'Connection',
    scoreLabelSecondary: 'Narrativ',
    defaultCount: 3,
    promptDE: 'Welche SDGs sollen vertieft werden?',
    promptEN: 'Which SDGs should be explored further?',
    aiRecommendedFields: {
      fields: ['primarySDG', 'secondarySDGs'],
      mode: 'concat',
    },
  },

  // Protagonisten: Welche Protagonisten weiterverfolgen?
  // AI empfiehlt ggf. recommendedProtagonists
  'validieren_05': {
    selectableProperty: 'protagonists',
    mode: 'multiple',
    maxSelections: 5,
    itemId: 'name',
    itemLabel: 'name',
    itemDescription: 'realProblem',
    itemScore: 'surpriseScore',
    itemScoreSecondary: 'authenticityScore',
    scoreLabel: 'Surprise',
    scoreLabelSecondary: 'Authenticity',
    defaultCount: 3,
    promptDE: 'Mit welchen Protagonisten soll weitergearbeitet werden?',
    promptEN: 'Which protagonists should be developed further?',
    aiRecommendedFields: {
      fields: ['recommendedProtagonists'],
      mode: 'concat',
    },
  },

  // Data Research: Welche Timing Windows sind relevant?
  'validieren_06': {
    selectableProperty: 'timingWindows',
    mode: 'multiple',
    maxSelections: 5,
    itemId: 'name',
    itemLabel: 'name',
    itemDescription: 'activationIdea',
    itemScore: 'mediaRelevanceScore',
    scoreLabel: 'Media Relevance',
    defaultCount: 3,
    promptDE: 'Welche Timing-Fenster sollen in die Strategie einfliessen?',
    promptEN: 'Which timing windows should inform the strategy?',
  },

  // Springboards: Welche kreativen Sprungbretter?
  'create_07': {
    selectableProperty: 'springboards',
    mode: 'multiple',
    maxSelections: 3,
    itemId: 'headline',
    itemLabel: 'headline',
    itemDescription: 'coreSpannung',
    defaultCount: 2,
    promptDE: 'Welche Springboards sollen weiterentwickelt werden?',
    promptEN: 'Which springboards should be developed further?',
  },

  // Idea Development: Welche Ideen weiterentwickeln?
  // AI empfiehlt ggf. recommendedIdea
  'create_09': {
    selectableProperty: 'ideas',
    mode: 'multiple',
    maxSelections: 2,
    itemId: 'type',
    itemLabel: 'headline',
    itemDescription: 'concept',
    itemScore: 'creativityScore',
    scoreLabel: 'Kreativität',
    defaultCount: 1,
    promptDE: 'Welche Ideen möchtest du weiterentwickeln? (max. 2)',
    promptEN: 'Which ideas do you want to develop further? (max. 2)',
    aiRecommendedFields: {
      fields: ['recommendedIdea'],
      mode: 'direct',
    },
  },

  // Partnerships: Welche Partner weiterverfolgen?
  'create_08': {
    selectableProperty: 'partnerships',
    mode: 'multiple',
    maxSelections: 5,
    itemId: 'partnerName',
    itemLabel: 'partnerName',
    itemDescription: 'strategicLogic',
    itemScore: 'unexpectedMatchScore',
    scoreLabel: 'Match',
    defaultCount: 3,
    promptDE: 'Mit welchen Partnern soll weitergearbeitet werden?',
    promptEN: 'Which partnerships should be pursued further?',
  },

  // Audience Design: Welche Zielgruppen-Segmente?
  'create_08b': {
    selectableProperty: 'audiences',
    mode: 'multiple',
    maxSelections: 4,
    itemId: 'name',
    itemLabel: 'name',
    itemDescription: 'whyTheyMatter',
    itemScore: 'impactScore',
    itemScoreSecondary: 'reachScore',
    scoreLabel: 'Impact',
    scoreLabelSecondary: 'Reach',
    defaultCount: 3,
    promptDE: 'Welche Zielgruppen-Segmente sollen aktiviert werden?',
    promptEN: 'Which audience segments should be activated?',
  },
}

/**
 * Gibt die Selection Config fuer ein Modul zurueck, oder null
 */
export function getSelectionConfig(moduleId: string): SelectionConfig | null {
  return SELECTION_CONFIGS[moduleId] || null
}

/**
 * Extrahiert die selektierbaren Items aus dem parsed Output
 */
export function getSelectableItems(moduleId: string, outputData: any): any[] {
  const config = SELECTION_CONFIGS[moduleId]
  if (!config || !outputData) return []
  const items = outputData[config.selectableProperty]
  return Array.isArray(items) ? items : []
}

/**
 * Gibt die Default-Selektion zurueck.
 * Prioritaet: AI-Empfehlung > Score-Sortierung > Reihenfolge
 */
export function getDefaultSelection(moduleId: string, outputData: any): (string | number)[] {
  const config = SELECTION_CONFIGS[moduleId]
  if (!config || !outputData) return []

  const items = getSelectableItems(moduleId, outputData)
  if (items.length === 0) return []

  // Alle validen Item-IDs sammeln (fuer Validierung)
  const validIds = new Set(items.map(item => item[config.itemId]))

  // 1. Versuch: AI-Empfehlung nutzen
  if (config.aiRecommendedFields) {
    const recommended = extractAIRecommendation(outputData, config.aiRecommendedFields, validIds)
    if (recommended.length > 0) {
      console.log(`[Selection] AI-Empfehlung fuer ${moduleId}:`, recommended)
      return recommended.slice(0, config.maxSelections || recommended.length)
    }
  }

  // 2. Fallback: Score-Sortierung
  let sorted = [...items]
  if (config.itemScore) {
    sorted.sort((a, b) => (b[config.itemScore!] || 0) - (a[config.itemScore!] || 0))
  }

  return sorted
    .slice(0, config.defaultCount)
    .map(item => item[config.itemId])
}

/**
 * Extrahiert AI-empfohlene Item-IDs aus dem Output.
 * Validiert gegen die tatsaechlich vorhandenen Items.
 */
function extractAIRecommendation(
  outputData: any,
  aiConfig: NonNullable<SelectionConfig['aiRecommendedFields']>,
  validIds: Set<string | number>
): (string | number)[] {
  const recommended: (string | number)[] = []

  for (const field of aiConfig.fields) {
    const value = outputData[field]
    if (value === undefined || value === null) continue

    if (aiConfig.mode === 'concat') {
      // Werte koennen Arrays oder Einzelwerte sein — alles flatten
      if (Array.isArray(value)) {
        recommended.push(...value)
      } else {
        recommended.push(value)
      }
    } else {
      // 'direct': Einzelwert direkt als ID
      if (Array.isArray(value)) {
        recommended.push(...value)
      } else {
        recommended.push(value)
      }
    }
  }

  // Nur IDs behalten, die tatsaechlich in den Items existieren
  const validated = recommended.filter(id => validIds.has(id))
  if (validated.length < recommended.length) {
    console.warn(`[Selection] ${recommended.length - validated.length} AI-empfohlene IDs nicht in Items gefunden:`,
      recommended.filter(id => !validIds.has(id)))
  }

  return validated
}
