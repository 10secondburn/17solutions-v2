export interface Partnership {
  partnerName: string
  partnerType: 'corporate' | 'ngo' | 'startup' | 'academic' | 'government'
  partnerProfile: string
  strategicLogic: string
  sdgFit: string
  activationSketch: string
  unexpectedMatchScore: number // 0-10
}

export interface PartnershipsOutput {
  partnerships: Partnership[]
  partnershipStrategy: string
  synergies: string[]
  confidenceScore: number
}

export function parsePartnershipsOutput(text: string): PartnershipsOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as PartnershipsOutput
  } catch {
    return null
  }
}
