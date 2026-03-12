export interface ProtagonistProfile {
  name: string
  whoExactly: string
  realProblem: string
  sdgConnection: string
  whySurprising: string
  brandRole: string
  narrativePotential: string
  surpriseScore: number    // 0-10
  authenticityScore: number // 0-10
  dataPoints: string[]
}

export interface ProtagonistSearchOutput {
  protagonists: ProtagonistProfile[]
  problemLandscape: string
  narrativeDirection: string
  confidenceScore: number
}

// Keep backward-compatible export name for agent.ts parser
export function parseTargetResearchOutput(text: string): ProtagonistSearchOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as ProtagonistSearchOutput
  } catch {
    return null
  }
}
