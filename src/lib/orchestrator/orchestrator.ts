import { getSessionContext, saveModuleOutput, advanceModule } from '@/lib/context-store/store'
import { loadModule, getNextAvailableModule } from './module-registry'
import { logUsage } from '@/lib/usage/tracker'
import type { OrchestratorRequest } from './types'
import { t } from '@/lib/language/translations'
import type { Language } from '@/types'
import { parseBrandEntryOutput } from '@/modules/verstehen/01-brand-entry/types'

/**
 * Agent-Orchestrator — Streaming-Variante
 *
 * Gibt einen ReadableStream zurück, der SSE-Events sendet:
 *   data: {"type":"token","text":"..."}
 *   data: {"type":"module","currentModule":"...","nextModule":"..."}
 *   data: {"type":"done","fullText":"..."}
 *   data: {"type":"error","message":"..."}
 */
export function executeOrchestratorStream(
  request: OrchestratorRequest,
  userId: string,
): ReadableStream {
  const encoder = new TextEncoder()

  function sendEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
  }

  return new ReadableStream({
    async start(controller) {
      try {
        // 1. Context laden
        const context = await getSessionContext(request.sessionId)
        if (!context) {
          controller.enqueue(sendEvent({ type: 'error', message: 'Session not found' }))
          controller.close()
          return
        }

        const lang = context.language as Language

        // 2. Prüfe ob User weiter will
        const advanceKeywords = ['continue', 'next', 'weiter', 'proceed', 'mach weiter', 'nächster schritt']
        const wantsAdvance = request.action === 'advance' ||
          advanceKeywords.some(kw => request.userInput.toLowerCase().includes(kw))

        if (wantsAdvance) {
          const nextModule = getNextAvailableModule(context.currentModule)
          if (nextModule) {
            await advanceModule(request.sessionId, nextModule)
            context.currentModule = nextModule
          } else {
            controller.enqueue(sendEvent({ type: 'token', text: t('chat.comingSoon', lang) }))
            controller.enqueue(sendEvent({ type: 'done' }))
            controller.close()
            return
          }
        }

        // 3. Modul laden
        const moduleExecutor = await loadModule(context.currentModule)
        if (!moduleExecutor) {
          controller.enqueue(sendEvent({ type: 'token', text: t('chat.comingSoon', lang) }))
          controller.enqueue(sendEvent({ type: 'done' }))
          controller.close()
          return
        }

        // 4. Modul-Info senden
        controller.enqueue(sendEvent({
          type: 'module',
          currentModule: context.currentModule,
          nextModule: getNextAvailableModule(context.currentModule),
        }))

        // 5. Streaming — wenn executeStream vorhanden
        if (moduleExecutor.executeStream) {
          const stream = await moduleExecutor.executeStream(context, request.userInput)
          let fullText = ''

          stream.on('text', (text: string) => {
            fullText += text
            controller.enqueue(sendEvent({ type: 'token', text }))
          })

          const finalMessage = await stream.finalMessage()

          const tokenUsage = {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            model: 'claude-sonnet-4-20250514',
          }

          // Output speichern
          const brandData = parseBrandEntryOutput(fullText)
          if (brandData) {
            await saveModuleOutput({
              sessionId: request.sessionId,
              moduleId: context.currentModule,
              outputData: brandData,
              citations: [{
                sourceId: `src_${context.currentModule}_ki`,
                type: 'KI',
                name: 'Claude Sonnet 4 — Analysis',
              }],
              confidenceScore: brandData.confidenceScore,
            })
          }

          // Usage loggen
          logUsage({
            userId,
            sessionId: request.sessionId,
            moduleId: context.currentModule,
            usage: tokenUsage,
          }).catch(console.error)

          controller.enqueue(sendEvent({
            type: 'done',
            fullText,
            currentModule: context.currentModule,
          }))

        } else {
          // Fallback: nicht-streaming Execute
          const result = await moduleExecutor.execute(context, request.userInput)

          controller.enqueue(sendEvent({ type: 'token', text: result.response }))

          if (result.outputData) {
            await saveModuleOutput({
              sessionId: request.sessionId,
              moduleId: context.currentModule,
              outputData: result.outputData,
              citations: result.citations as any,
              confidenceScore: result.confidenceScore,
            })
          }

          logUsage({
            userId,
            sessionId: request.sessionId,
            moduleId: context.currentModule,
            usage: result.tokenUsage,
          }).catch(console.error)

          controller.enqueue(sendEvent({
            type: 'done',
            fullText: result.response,
            currentModule: context.currentModule,
          }))
        }

        controller.close()
      } catch (error: any) {
        console.error('Orchestrator stream error:', error)
        controller.enqueue(sendEvent({
          type: 'error',
          message: error.status === 429
            ? 'Rate limit — bitte kurz warten.'
            : (error.message || 'Ein Fehler ist aufgetreten.'),
        }))
        controller.close()
      }
    },
  })
}
