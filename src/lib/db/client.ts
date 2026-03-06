import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL für Cloud-Datenbanken (Neon, Supabase etc.)
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
  // Connection Pool für Serverless
  max: 10,
  idleTimeoutMillis: 30000,
})

export const db = drizzle(pool, { schema })
