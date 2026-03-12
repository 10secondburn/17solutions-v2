import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getMarketScopeSystemPrompt } from './prompts'
import { parseMarketScopeOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const marketScopeModule: ModuleExecutor = {
  config: {
    id: 'create_08c',
    name: 'Market Scope',
    cluster: 'create',
    stepNum: 11,
    nextModuleId: 'validieren_06',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getMarketScopeSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('create_08c'),
      max_tokens: 12000,
      temperature: 0.5,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseMarketScopeOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_market_scope_ki',
          type: 'KI',
          name: 'Claude Sonnet 4. Market Scope',
          detail: `Markt-Definition fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'PLAUSIBEL',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_market_scope_ki',
        type: 'KI',
        name: 'Claude Sonnet 4. Market Scope',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('create_08c'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getMarketScopeSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('create_08c'),
      max_tokens: 12000,
      temperature: 0.5,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
