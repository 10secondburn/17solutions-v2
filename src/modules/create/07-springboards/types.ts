export interface Springboard {
  headline: string
  coreSpannung: string // Kernspannung
  dataAnchor: string
  creativeTerritory: string
  direction: 'bold_transformation' | 'strategic_lever' | 'system_intervention'
  isWildcard: boolean
}

export interface SpringboardsOutput {
  springboards: Springboard[]
  directions: {
    boldTransformation: string
    strategicLever: string
    systemIntervention: string
  }
  overallCreativeStrategy: string
  confidenceScore: number
}

export function parseSpringboardsOutput(text: string): SpringboardsOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as SpringboardsOutput
  } catch {
    return null
  }
}
