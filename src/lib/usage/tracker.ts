import { db } from '@/lib/db/client'
import { usageEvents } from '@/lib/db/schema'
import { calculateCost } from './pricing'
import { eq, sql, and, gte, lte } from 'drizzle-orm'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: string
}

/**
 * Loggt ein Usage-Event nach jedem Claude API-Call.
 * Wird async aufgerufen (fire-and-forget), blockiert nicht den Response.
 */
export async function logUsage(params: {
  userId: string
  sessionId?: string
  moduleId?: string
  usage: TokenUsage
  cached?: boolean
}) {
  const cost = calculateCost(params.usage.model, params.usage.inputTokens, params.usage.outputTokens)

  await db.insert(usageEvents).values({
    userId: params.userId,
    sessionId: params.sessionId || null,
    moduleId: params.moduleId || null,
    model: params.usage.model,
    tokensInput: params.usage.inputTokens,
    tokensOutput: params.usage.outputTokens,
    tokensTotal: params.usage.inputTokens + params.usage.outputTokens,
    costUsd: cost.toString(),
    cached: params.cached || false,
  })
}

/**
 * Holt Usage-Summary pro User (für Admin Dashboard)
 */
export async function getUserUsageSummary(from?: Date, to?: Date) {
  const conditions = []
  if (from) conditions.push(gte(usageEvents.createdAt, from))
  if (to) conditions.push(lte(usageEvents.createdAt, to))

  const result = await db
    .select({
      userId: usageEvents.userId,
      totalTokens: sql<number>`SUM(${usageEvents.tokensTotal})`,
      totalInputTokens: sql<number>`SUM(${usageEvents.tokensInput})`,
      totalOutputTokens: sql<number>`SUM(${usageEvents.tokensOutput})`,
      totalCostUsd: sql<number>`SUM(CAST(${usageEvents.costUsd} AS NUMERIC))`,
      totalCalls: sql<number>`COUNT(*)`,
      cachedCalls: sql<number>`SUM(CASE WHEN ${usageEvents.cached} THEN 1 ELSE 0 END)`,
    })
    .from(usageEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(usageEvents.userId)

  return result
}
