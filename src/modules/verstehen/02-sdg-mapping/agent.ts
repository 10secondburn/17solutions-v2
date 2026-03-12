import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getSDGMappingSystemPrompt } from './prompts'
import { parseSDGMappingOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const sdgMappingModule: ModuleExecutor = {
  config: {
    id: 'verstehen_02',
    name: 'SDG Mapping',
    cluster: 'verstehen',
    stepNum: 2,
    nextModuleId: 'validieren_04',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSDGMappingSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('verstehen_02'),
      max_tokens: 8000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const mappingData = parseSDGMappingOutput(responseText)

    return {
      response: responseText,
      outputData: mappingData ? {
        ...mappingData,
        citations: [{
          sourceId: 'src_sdg_mapping_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — SDG Mapping',
          detail: `SDG-Analyse fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: mappingData.confidenceScore > 0.8 ? 'VERIFIZIERT' :
                      mappingData.confidenceScore > 0.5 ? 'PLAUSIBEL' : 'HYPOTHESE',
        }],
      } : undefined,
      citations: mappingData ? [{
        sourceId: 'src_sdg_mapping_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — SDG Mapping',
      }] : undefined,
      confidenceScore: mappingData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('verstehen_02'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSDGMappingSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('verstehen_02'),
      max_tokens: 8000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
