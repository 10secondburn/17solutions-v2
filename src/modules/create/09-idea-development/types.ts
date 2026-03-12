export interface IdeaConcept {
  type: 'kampagne' | 'aktivierung' | 'stunt' | 'experience' | 'wildcard'
  typeLabel: string  // German display label
  headline: string  // Max 8 words, crystal clear
  concept: string   // 3-4 sentences: what happens, why it works
  sdgConnection: string  // How this idea connects to the SDG strategy
  whyItWorks: string  // The strategic/emotional logic
  creativityScore: number  // 0-10
}

export interface IdeaDevelopmentOutput {
  ideas: IdeaConcept[]  // Exactly 5 ideas
  creativeStrategy: string  // Overall creative direction summary
  confidenceScore: number
}

export function parseIdeaDevelopmentOutput(text: string): IdeaDevelopmentOutput | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1].trim())
    if (parsed.ideas && Array.isArray(parsed.ideas)) {
      return parsed as IdeaDevelopmentOutput
    }
    return null
  } catch {
    return null
  }
}
