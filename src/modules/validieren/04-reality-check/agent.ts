import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getRealityCheckSystemPrompt } from './prompts'
import { parseRealityCheckOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const realityCheckModule: ModuleExecutor = {
  config: {
    id: 'validieren_04',
    name: 'Reality Check',
    cluster: 'validieren',
    stepNum: 3,
    nextModuleId: 'verstehen_03',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getRealityCheckSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('validieren_04'),
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseRealityCheckOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_reality_check_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — Reality Check',
          detail: `Reality Check fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: outputData.confidenceScore > 0.8 ? 'VERIFIZIERT' :
                      outputData.confidenceScore > 0.5 ? 'PLAUSIBEL' : 'HYPOTHESE',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_reality_check_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — Reality Check',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('validieren_04'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getRealityCheckSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('validieren_04'),
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
