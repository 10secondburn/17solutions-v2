export interface MarketScopeOutput {
  primaryMarket: string
  regions: string[]
  scale: 'regional' | 'national' | 'continental' | 'global'
  marketContext: string
  confidenceScore: number
}

export function parseMarketScopeOutput(text: string): MarketScopeOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as MarketScopeOutput
  } catch {
    return null
  }
}
