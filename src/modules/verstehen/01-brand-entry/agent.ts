import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getBrandEntrySystemPrompt } from './prompts'
import { parseBrandEntryOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const brandEntryModule: ModuleExecutor = {
  config: {
    id: 'verstehen_01',
    name: 'Brand Entry',
    cluster: 'verstehen',
    stepNum: 1,
    nextModuleId: 'verstehen_02', // SDG Mapping (coming soon)
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getBrandEntrySystemPrompt(context.language, context.brandName)

    const messages = getConversationMessages(context, userInput)

    // Claude API Call
    const response = await anthropic.messages.create({
      model: getModelForModule('verstehen_01'),
      max_tokens: 8000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const brandData = parseBrandEntryOutput(responseText)

    const tokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: getModelForModule('verstehen_01'),
    }

    return {
      response: responseText,
      outputData: brandData ? {
        ...brandData,
        citations: [{
          sourceId: 'src_brand_entry_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Brand Analysis',
          detail: `Analyse der Marke ${context.brandName || userInput}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: brandData.confidenceScore > 0.8 ? 'VERIFIZIERT' :
                      brandData.confidenceScore > 0.5 ? 'PLAUSIBEL' : 'HYPOTHESE',
        }],
      } : undefined,
      citations: brandData ? [{
        sourceId: 'src_brand_entry_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Brand Analysis',
      }] : undefined,
      confidenceScore: brandData?.confidenceScore,
      tokenUsage,
    }
  },

  /**
   * Streaming-Variante — liefert ReadableStream zurück
   */
  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getBrandEntrySystemPrompt(context.language, context.brandName)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('verstehen_01'),
      max_tokens: 8000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
