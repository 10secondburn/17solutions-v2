import { NextRequest } from 'next/server'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

/**
 * GET /api/health — Diagnose-Endpunkt
 * Prüft ob alle Services erreichbar sind
 */
export async function GET(req: NextRequest) {
  const checks: Record<string, string> = {}

  // 1. Env Vars
  checks['DATABASE_URL'] = process.env.DATABASE_URL ? 'SET' : 'MISSING'
  checks['NEXTAUTH_SECRET'] = process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING'
  checks['ANTHROPIC_API_KEY'] = process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING'
  checks['NEXTAUTH_URL'] = process.env.NEXTAUTH_URL || '(not set — auto-detect)'
  checks['VERCEL_URL'] = process.env.VERCEL_URL || '(not set)'
  checks['NODE_ENV'] = process.env.NODE_ENV || '(not set)'

  // 2. DB Connection
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users)
    checks['DB_CONNECTION'] = 'OK'
    checks['USER_COUNT'] = String(result[0]?.count ?? 0)
  } catch (e: any) {
    checks['DB_CONNECTION'] = `FAILED: ${e.message}`
  }

  return new Response(JSON.stringify(checks, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
}
