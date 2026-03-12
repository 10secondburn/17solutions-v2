export interface BudgetItem {
  category: string
  amount: string
  percentage: number
}

export interface ImpactScenario {
  name: 'conservative' | 'target' | 'ambitious'
  revenueImpact: string
  brandValueImpact: string
  talentEffect: string
  timeline: string
  probability: number
}

export interface ComparableCase {
  name: string
  brand: string
  outcome: string
  relevance: string
}

export interface ROIEstimationOutput {
  budgetBreakdown: BudgetItem[]
  totalBudgetRange: string
  projectedReturns: {
    mediaValue: string
    brandValue: string
    salesImpact: string
    talentEffect: string
  }
  roiRatio: number
  roiConfidenceInterval: string
  assumptions: Array<{
    assumption: string
    source: string
    risk: string
    impactIfWrong: string
  }>
  benchmarkComparison: string
  confidenceScore: number
  scenarios?: ImpactScenario[]
  revenueLogic?: string
  comparableCases?: ComparableCase[]
  riskAssessment?: string
}

export function parseROIEstimationOutput(text: string): ROIEstimationOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as ROIEstimationOutput
  } catch {
    return null
  }
}
