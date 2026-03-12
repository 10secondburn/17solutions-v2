export interface ImpactScenario {
  name: 'conservative' | 'target' | 'ambitious'
  revenueImpact: string
  brandValueImpact: string
  talentEffect: string
  timeline: string
  probability: number // 0-1
}

export interface ComparableCase {
  name: string
  brand: string
  outcome: string
  relevance: string
}

export interface BusinessImpactOutput {
  scenarios: ImpactScenario[]
  revenueLogic: string
  riskAssessment: string
  comparableCases: ComparableCase[]
  keyMetrics: string[]
  confidenceScore: number
}

export function parseBusinessImpactOutput(text: string): BusinessImpactOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as BusinessImpactOutput
  } catch {
    return null
  }
}
