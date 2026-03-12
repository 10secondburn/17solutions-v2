import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getExecutiveSummarySystemPrompt } from './prompts'
import { parseExecutiveSummaryOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const executiveSummaryModule: ModuleExecutor = {
  config: {
    id: 'bewerten_13',
    name: 'Executive Summary',
    cluster: 'bewerten',
    stepNum: 16,
    nextModuleId: null as any,
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getExecutiveSummarySystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('bewerten_13'),
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseExecutiveSummaryOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_executive_summary_ki',
          type: 'KI',
          name: 'Claude Sonnet 4. Executive Summary',
          detail: `Strategische Zusammenfassung fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'PLAUSIBEL',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_executive_summary_ki',
        type: 'KI',
        name: 'Claude Sonnet 4. Executive Summary',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('bewerten_13'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getExecutiveSummarySystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('bewerten_13'),
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
