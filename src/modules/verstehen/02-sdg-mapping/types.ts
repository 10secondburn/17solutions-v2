export interface SDGScoreOutput {
  sdg: number
  name: string
  connectionStrength: number  // 0-10
  strategicOpportunity: number // 0-10
  authenticityRisk: number    // 0-10 (higher = more risk)
  narrativePotential: number  // 0-10
  rationale: string
}

export interface SDGMappingOutput {
  scores: SDGScoreOutput[]
  topSDGs: number[]
  overallAnalysis: string
  confidenceScore: number
}

export function parseSDGMappingOutput(text: string): SDGMappingOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as SDGMappingOutput
  } catch {
    return null
  }
}
