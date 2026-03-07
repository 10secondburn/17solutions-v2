import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  const isSecure = request.url.startsWith('https://')
  const token = await getToken({
    req: request,
    secret,
    secureCookie: isSecure,
    salt: isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token',
    cookieName: isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token',
  })
  const { pathname } = request.nextUrl

  // Öffentliche Routen
  const publicPaths = ['/login', '/invite', '/api/auth', '/api/health']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    // Eingeloggt → weiter zum Dashboard
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Nicht eingeloggt → Login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-Routen prüfen
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/session/:path*',
    '/admin/:path*',
    '/login',
    '/api/sessions/:path*',
    '/api/orchestrator/:path*',
    '/api/admin/:path*',
  ],
}
