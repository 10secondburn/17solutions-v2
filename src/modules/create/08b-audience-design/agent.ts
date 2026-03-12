import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getAudienceDesignSystemPrompt } from './prompts'
import { parseAudienceDesignOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const audienceDesignModule: ModuleExecutor = {
  config: {
    id: 'create_08b',
    name: 'Audience Design',
    cluster: 'create',
    stepNum: 10,
    nextModuleId: 'create_08c',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getAudienceDesignSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('create_08b'),
      max_tokens: 12000,
      temperature: 0.8,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseAudienceDesignOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_audience_design_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Audience Design',
          detail: `Zielpublikum-Strategie fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'HYPOTHESE',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_audience_design_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Audience Design',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('create_08b'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getAudienceDesignSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('create_08b'),
      max_tokens: 12000,
      temperature: 0.8,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
