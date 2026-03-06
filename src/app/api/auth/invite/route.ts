import { NextRequest, NextResponse } from 'next/server'
import { acceptInvite } from '@/lib/auth/invite'

// POST — Einladung annehmen (Token + Name + Passwort)
export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json()

    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen lang sein.' }, { status: 400 })
    }

    const user = await acceptInvite(token, name, password)

    return NextResponse.json({ success: true, email: user.email })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Einladung ungültig oder abgelaufen.' },
      { status: 400 },
    )
  }
}
