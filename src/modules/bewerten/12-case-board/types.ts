export interface CaseBoardExecution {
  film: string
  digital: string[]
  pr: string
  activation: string
  partnership: string
}

export interface CaseBoardImpact {
  sdgImpact: string
  brandImpact: string
  keyMetrics: string[]
}

export interface CaseBoardOutput {
  campaignName: string
  tagline: string
  context: string
  challenge: string
  insight: string       // The Human Insight — the human truth
  idea: string          // Core concept in 2-3 sentences
  execution: CaseBoardExecution
  impact: CaseBoardImpact
  confidenceScore: number
}

export function parseCaseBoardOutput(text: string): CaseBoardOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as CaseBoardOutput
  } catch {
    return null
  }
}
