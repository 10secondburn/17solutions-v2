export interface ExecutiveSummarySection {
  phase: string
  moduleId: string
  moduleName: string
  summary: string
  keyFindings: string[]
}

export interface ExecutiveSummaryOutput {
  title: string
  brandName: string
  date: string
  sections: ExecutiveSummarySection[]
  strategicConclusion: string
  ipNotice: string
  confidenceScore: number
}

export function parseExecutiveSummaryOutput(text: string): ExecutiveSummaryOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as ExecutiveSummaryOutput
  } catch {
    return null
  }
}
