/**
 * Seed-Script: Erstellt den initialen Admin-User (Roland)
 *
 * Ausführen: npx tsx src/lib/db/seed.ts
 */
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { users } from './schema'
import bcrypt from 'bcryptjs'

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool)

  const passwordHash = await bcrypt.hash('changeme123', 12)

  await db.insert(users).values({
    email: 'f100r@me.com',
    passwordHash,
    name: 'Roland Rudolf',
    role: 'admin',
    language: 'de',
    status: 'active',
  }).onConflictDoNothing()

  console.log('✅ Admin user seeded: f100r@me.com (Passwort: changeme123 — bitte ändern!)')

  await pool.end()
}

seed().catch(console.error)
