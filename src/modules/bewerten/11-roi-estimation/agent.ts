import Anthropic from '@anthropic-ai/sdk'
import type { ModuleExecutor, ModuleResult } from '@/lib/orchestrator/types'
import type { SessionContext } from '@/lib/context-store/types'
import { getConversationMessages } from '@/lib/orchestrator/conversation'
import { getROIEstimationSystemPrompt } from './prompts'
import { parseROIEstimationOutput } from './types'
import { getModelForModule } from '@/lib/models/config'

export const roiEstimationModule: ModuleExecutor = {
  config: {
    id: 'bewerten_11',
    name: 'ROI Estimation',
    cluster: 'bewerten',
    stepNum: 14,
    nextModuleId: 'bewerten_12',
  },

  async execute(context: SessionContext, userInput: string): Promise<ModuleResult> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getROIEstimationSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const response = await anthropic.messages.create({
      model: getModelForModule('bewerten_11'),
      max_tokens: 12000,
      temperature: 0.5,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const outputData = parseROIEstimationOutput(responseText)

    return {
      response: responseText,
      outputData: outputData ? {
        ...outputData,
        citations: [{
          sourceId: 'src_roi_estimation_ki',
          type: 'KI',
          name: 'Claude Sonnet 4 — ROI Estimation',
          detail: `ROI-Schaetzung fuer ${context.brandName}`,
          accessedAt: new Date().toISOString(),
          freshness: 'aktuell',
          confidence: 'PLAUSIBEL',
        }],
      } : undefined,
      citations: outputData ? [{
        sourceId: 'src_roi_estimation_ki',
        type: 'KI',
        name: 'Claude Sonnet 4 — ROI Estimation',
      }] : undefined,
      confidenceScore: outputData?.confidenceScore,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: getModelForModule('bewerten_11'),
      },
    }
  },

  async executeStream(context: SessionContext, userInput: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = getROIEstimationSystemPrompt(context.language, context)

    const messages = getConversationMessages(context, userInput)

    const stream = anthropic.messages.stream({
      model: getModelForModule('bewerten_11'),
      max_tokens: 12000,
      temperature: 0.5,
      system: systemPrompt,
      messages,
    })

    return stream
  },
}
