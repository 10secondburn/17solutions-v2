import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Erstellt eine Einladung für einen neuen Nutzer.
 * Nur Admin darf dies aufrufen.
 */
export async function createInvite(email: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage

  const [user] = await db.insert(users).values({
    email,
    passwordHash: '', // Wird beim Annehmen gesetzt
    role: 'user',
    status: 'invited',
    language: 'de',
    inviteToken: token,
    inviteExpiresAt: expiresAt,
  }).returning()

  return { email: user.email, inviteToken: token, inviteExpiresAt: expiresAt }
}

/**
 * Nimmt eine Einladung an: Setzt Passwort und aktiviert den Account.
 */
export async function acceptInvite(token: string, name: string, password: string) {
  const [user] = await db.select().from(users)
    .where(eq(users.inviteToken, token))
    .limit(1)

  if (!user) throw new Error('Einladung nicht gefunden.')
  if (user.status !== 'invited') throw new Error('Einladung bereits angenommen.')
  if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) throw new Error('Einladung abgelaufen.')

  const passwordHash = await bcrypt.hash(password, 12)

  const [updated] = await db.update(users)
    .set({
      name,
      passwordHash,
      status: 'active',
      inviteToken: null,
      inviteExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning()

  return { email: updated.email, name: updated.name }
}
