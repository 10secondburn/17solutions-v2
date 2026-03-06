import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { createInvite } from '@/lib/auth/invite'

// POST — Neuen Nutzer einladen (nur Admin)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await req.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Gültige E-Mail erforderlich.' }, { status: 400 })
  }

  try {
    const invite = await createInvite(email)
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invite.inviteToken}`

    return NextResponse.json({
      success: true,
      email: invite.email,
      inviteUrl,
      expiresAt: invite.inviteExpiresAt,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Einladung.' },
      { status: 400 },
    )
  }
}
