export interface BrandEntryOutput {
  brandName: string
  sector?: string
  positioning: string
  coreValues: string[]
  marketPosition: 'category_leader' | 'challenger' | 'niche' | 'emerging'
  currentSDGActivities: string[]
  culturalMoment: string
  sdgHypothesis: string
  confidenceScore: number
}

export function parseBrandEntryOutput(text: string): BrandEntryOutput | null {
  try {
    // Extrahiere JSON-Block aus der Antwort
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as BrandEntryOutput
  } catch {
    return null
  }
}
