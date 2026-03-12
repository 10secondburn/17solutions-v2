export interface AudienceSegment {
  name: string
  whoTheyAre: string
  whyTheyMatter: string
  leverageToAct: string
  connectionToProtagonist: string
  reachChannels: string[]
  emotionalTrigger: string
  activationIdea: string
  impactScore: number   // 0-10: How much leverage does this audience have?
  reachScore: number    // 0-10: How easily can we reach them?
}

export interface AudienceDesignOutput {
  audiences: AudienceSegment[]
  audienceStrategy: string
  protagonistAudienceBridge: string
  confidenceScore: number
}

export function parseAudienceDesignOutput(text: string): AudienceDesignOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    return parsed as AudienceDesignOutput
  } catch {
    return null
  }
}
