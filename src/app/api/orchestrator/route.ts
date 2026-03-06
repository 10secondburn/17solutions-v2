import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { executeOrchestratorStream } from '@/lib/orchestrator/orchestrator'
import { db } from '@/lib/db/client'
import { messages } from '@/lib/db/schema'

export const maxDuration = 120

/**
 * POST /api/orchestrator — Streaming SSE Response
 *
 * Der Client empfängt Server-Sent Events:
 *   data: {"type":"token","text":"Hallo"}
 *   data: {"type":"module","currentModule":"verstehen_01"}
 *   data: {"type":"done","fullText":"...","currentModule":"..."}
 *   data: {"type":"error","message":"..."}
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { sessionId, userInput, action } = body

    if (!sessionId || !userInput) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or userInput' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userId = (session.user as any).id

    // User-Message in DB speichern
    await db.insert(messages).values({
      sessionId,
      role: 'user',
      content: userInput,
    })

    // Streaming-Response erzeugen
    const orchestratorStream = executeOrchestratorStream(
      { sessionId, userInput, action },
      userId,
    )

    // Wir wrappen den Stream um die Assistant-Message am Ende zu speichern
    const encoder = new TextEncoder()
    let fullResponseText = ''

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = orchestratorStream.getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Durchleiten zum Client
            controller.enqueue(value)

            // fullText aus done-Event extrahieren für DB-Speicherung
            const text = new TextDecoder().decode(value)
            const lines = text.split('\n').filter(l => l.startsWith('data: '))
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.type === 'done' && parsed.fullText) {
                  fullResponseText = parsed.fullText
                }
              } catch {}
            }
          }
        } finally {
          reader.releaseLock()
        }

        // Assistant-Message in DB speichern
        if (fullResponseText) {
          await db.insert(messages).values({
            sessionId,
            role: 'assistant',
            content: fullResponseText,
          }).catch(console.error)
        }

        controller.close()
      },
    })

    return new Response(wrappedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Orchestrator error:', error)

    return new Response(JSON.stringify({
      error: error.status === 429
        ? 'Rate limit — bitte kurz warten.'
        : (error.message || 'Ein Fehler ist aufgetreten.'),
    }), {
      status: error.status === 429 ? 429 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
