import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getBusinessImpactSystemPrompt } from './prompts'
import { parseBusinessImpactOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const businessImpactModule: ModuleExecutor = {
  config: {
    id: 'bewerten_10',
    name: 'Business Impact',
    cluster: 'bewerten',
    stepNum: 13,
    nextModuleId: 'bewerten_11',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getBusinessImpactSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('bewerten_10'),
      max_tokens: 12000,
      temperature: 0.5, // Niedrigere Temperature für analytische Genauigkeit
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseBusinessImpactOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_business_impact_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Business Impact',
          detail: `Business Impact Modell fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'PLAUSIBEL',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_business_impact_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Business Impact',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('bewerten_10'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getBusinessImpactSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('bewerten_10'),
      max_tokens: 12000,
      temperature: 0.5,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
