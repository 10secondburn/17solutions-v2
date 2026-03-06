import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getSDGMappingSystemPrompt } from './prompts'
import { parseSDGMappingOutput } from './types'

const MODEL = 'claude-sonnet-4-20250514'

export const sdgMappingModule: ModuleExecutor = {
  config: {
    id: 'verstehen_02',
    name: 'SDG Mapping',
    cluster: 'verstehen',
    stepNum: 3,
    nextModuleId: 'verstehen_03',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSDGMappingSystemPrompt(context.language, context)

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userInput },
    ]

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
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
        model: MODEL,
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSDGMappingSystemPrompt(context.language, context)

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userInput },
    ]

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
