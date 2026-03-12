import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getCaseBoardSystemPrompt } from './prompts'
import { parseCaseBoardOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const caseBoardModule: ModuleExecutor = {
  config: {
    id: 'bewerten_12',
    name: 'Case Board',
    cluster: 'bewerten',
    stepNum: 15,
    nextModuleId: 'bewerten_13',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getCaseBoardSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('bewerten_12'),
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseCaseBoardOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_case_board_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Case Board',
          detail: `Case Board fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'PLAUSIBEL',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_case_board_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Case Board',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('bewerten_12'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getCaseBoardSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('bewerten_12'),
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
