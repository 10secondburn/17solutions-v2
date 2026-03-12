import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getSpringboardsSystemPrompt } from './prompts'
import { parseSpringboardsOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const springboardsModule: ModuleExecutor = {
  config: {
    id: 'create_07',
    name: 'Springboards',
    cluster: 'create',
    stepNum: 7,
    nextModuleId: 'create_09',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSpringboardsSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('create_07'),
      max_tokens: 12000,
      temperature: 0.8, // Höhere Temperature für Kreativität
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseSpringboardsOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_springboards_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Springboards',
          detail: `Kreative Springboards fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'HYPOTHESE', // Kreative Phase = grundsätzlich hypothetisch
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_springboards_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Springboards',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('create_07'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSpringboardsSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('create_07'),
      max_tokens: 12000,
      temperature: 0.8,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
