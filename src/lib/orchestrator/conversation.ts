import type Anthropic from '@anthropic-ai/sdk'
import type { SessionContext } from '@/lib/context-store/types'

/**
 * Extrahiert die Konversations-Messages aus dem enriched Context.
 * Falls keine vorhanden → Fallback auf einfache User-Message.
 *
 * Der Orchestrator packt die aufbereiteten Messages in
 * context._conversationMessages. Wenn ein Agent direkt aufgerufen
 * wird (ohne Orchestrator), gibt es das Feld nicht → Fallback.
 */
export function getConversationMessages(
  context: SessionContext,
  userInput: string,
): Anthropic.MessageParam[] {
  // Enriched Context vom Orchestrator?
  const enriched = (context as any)._conversationMessages as Anthropic.MessageParam[] | undefined

  if (enriched && enriched.length > 0) {
    return enriched
  }

  // Fallback: Einfache User-Message
  return [{ role: 'user', content: userInput }]
}
