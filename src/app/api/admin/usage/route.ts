import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { getUserUsageSummary } from '@/lib/usage/tracker'
import { db } from '@/lib/db/client'
import { users, sessions } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

// GET — Usage-Summary (nur Admin)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : undefined
  const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : undefined

  // Usage-Daten
  const usageData = await getUserUsageSummary(from, to)

  // User-Details dazuladen
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    lastLoginAt: users.lastLoginAt,
    sessionCount: sql<number>`(SELECT COUNT(*) FROM sessions WHERE sessions.user_id = ${users.id})`,
  }).from(users)
    .where(eq(users.status, 'active'))

  // Merge
  const result = allUsers.map(user => {
    const usage = usageData.find(u => u.userId === user.id)
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      lastLoginAt: user.lastLoginAt,
      sessionCount: user.sessionCount,
      totalTokens: usage?.totalTokens || 0,
      totalCostUsd: usage?.totalCostUsd || 0,
      totalCalls: usage?.totalCalls || 0,
      cachedCalls: usage?.cachedCalls || 0,
    }
  })

  // Aggregierte Summen
  const totals = {
    totalTokens: result.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
    totalCostUsd: result.reduce((sum, r) => sum + (Number(r.totalCostUsd) || 0), 0),
    totalCalls: result.reduce((sum, r) => sum + (r.totalCalls || 0), 0),
    userCount: result.length,
  }

  return NextResponse.json({ users: result, totals })
}
