export interface SDGSelectionOutput {
  primarySDG: number
  secondarySDGs: number[]
  rationale: string
  strategicNarrative: string
  confidenceScore: number
}

export function parseSDGSelectionOutput(text: string): SDGSelectionOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as SDGSelectionOutput
  } catch {
    return null
  }
}
