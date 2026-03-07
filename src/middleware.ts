import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Öffentliche Routen
  const publicPaths = ['/login', '/invite', '/api/auth']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    // Eingeloggt → weiter zum Dashboard
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Nicht eingeloggt → Login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-Routen prüfen
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const role = (req.auth as any)?.user?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

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
