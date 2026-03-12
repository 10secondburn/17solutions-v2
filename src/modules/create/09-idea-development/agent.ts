import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getIdeaDevelopmentSystemPrompt } from './prompts'
import { parseIdeaDevelopmentOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const ideaDevelopmentModule: ModuleExecutor = {
  config: {
    id: 'create_09',
    name: 'Idea Development',
    cluster: 'create',
    stepNum: 12,
    nextModuleId: 'create_08',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getIdeaDevelopmentSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('create_09'),
      max_tokens: 12000,
      temperature: 0.9,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseIdeaDevelopmentOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_idea_dev_ki',
          type: 'KI',
          name: 'Claude Opus 4.6 — Idea Development',
          detail: `5 kreative Konzepttypen fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'HYPOTHESE',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_idea_dev_ki',
        type: 'KI',
        name: 'Claude Opus 4.6 — Idea Development',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('create_09'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getIdeaDevelopmentSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('create_09'),
      max_tokens: 12000,
      temperature: 0.9,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
