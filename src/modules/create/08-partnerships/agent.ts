import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getPartnershipsSystemPrompt } from './prompts'
import { parsePartnershipsOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const partnershipsModule: ModuleExecutor = {
  config: {
    id: 'create_08',
    name: 'Partnerships',
    cluster: 'create',
    stepNum: 9,
    nextModuleId: 'create_08b',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getPartnershipsSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('create_08'),
      max_tokens: 12000,
      temperature: 0.8,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parsePartnershipsOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_partnerships_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Partnerships',
          detail: `Partnership-Strategie fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'HYPOTHESE',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_partnerships_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Partnerships',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('create_08'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getPartnershipsSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('create_08'),
      max_tokens: 12000,
      temperature: 0.8,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
