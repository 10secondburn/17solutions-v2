export interface DataPoint {
  headline: string
  value: string
  context: string
  source: string
  freshnessYears: number
  cognitiveDissonance: boolean
  visualizationSuggestion: string
  confidence: number // 0-1
}

export interface TimingWindow {
  name: string
  date: string                // ISO date or descriptive ("every March 8")
  type: 'calendar' | 'anniversary' | 'conference' | 'future' | 'seasonal'
  sdgRelevance: string
  protagonistRelevance: string
  activationIdea: string
  leadTimeMonths: number
  mediaRelevanceScore: number // 0-10
  recurring: boolean
}

export interface DataResearchOutput {
  dataPoints: DataPoint[]
  timingWindows?: TimingWindow[]
  dataNarrative: string
  timingStrategy?: string
  narrativeArc?: string
  keyStatistic: string
  confidenceScore: number
}

export function parseDataResearchOutput(text: string): DataResearchOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as DataResearchOutput
  } catch {
    return null
  }
}
