import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getSDGSelectionSystemPrompt } from './prompts'
import { parseSDGSelectionOutput } from './types'

const MODEL = 'claude-sonnet-4-20250514'

export const sdgSelectionModule: ModuleExecutor = {
  config: {
    id: 'verstehen_03',
    name: 'SDG Selection',
    cluster: 'verstehen',
    stepNum: 4,
    nextModuleId: 'validieren_04',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSDGSelectionSystemPrompt(context.language, context)

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userInput },
    ]

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const selectionData = parseSDGSelectionOutput(responseText)

    return {
      response: responseText,
      outputData: selectionData ? {
        ...selectionData,
        citations: [{
          sourceId: 'src_sdg_selection_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — SDG Selection',
          detail: `SDG-Auswahl fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'PLAUSIBEL',
        }],
      } : undefined,
      citations: selectionData ? [{
        sourceId: 'src_sdg_selection_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — SDG Selection',
      }] : undefined,
      confidenceScore: selectionData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: MODEL,
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getSDGSelectionSystemPrompt(context.language, context)

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userInput },
    ]

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
