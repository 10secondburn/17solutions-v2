export interface VerifiedClaim {
  claim: string
  status: 'verified' | 'gap' | 'hidden_potential'
  evidence: string
  source: string
  confidence: number // 0-1
}

export interface RealityCheckOutput {
  verifiedClaims: VerifiedClaim[]
  gaps: string[]
  hiddenPotential: string[]
  greenwashingRiskScore: number // 0-10
  greenwashingRationale: string
  overallAssessment: string
  confidenceScore: number
}

export function parseRealityCheckOutput(text: string): RealityCheckOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as RealityCheckOutput
  } catch {
    return null
  }
}
