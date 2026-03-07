import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PROTECTED = ['/dashboard', '/projects', '/pipelines', '/servers', '/monitoring', '/aws', '/ai']
const AUTH_ONLY  = ['/auth/login', '/auth/register']

const rl = new Map<string, { n: number; t: number }>()
function rateLimit(ip: string): boolean {
  const now = Date.now(), w = 60_000, max = Number(process.env.RATE_LIMIT_MAX ?? 100)
  const e = rl.get(ip)
  if (!e || now > e.t) { rl.set(ip, { n: 1, t: now + w }); return true }
  if (e.n >= max) return false
  e.n++; return true
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anon'
    if (!rateLimit(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const token     = req.cookies.get('acciq_token')?.value
  const guestCookie = req.cookies.get('guest_session')?.value
  const authed    = token ? verifyToken(token) !== null : false
  const isGuest   = !!guestCookie || searchParams.get('guest') === '1'

  const isProtected = PROTECTED.some(r => pathname.startsWith(r))
  const isAuthRoute  = AUTH_ONLY.some(r => pathname.startsWith(r))

  if (isProtected && !authed && !isGuest) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  const res = NextResponse.next()

  // If ?guest=1 is present, persist it as a cookie so sub-pages also pass
  if (searchParams.get('guest') === '1' && !guestCookie) {
    res.cookies.set('guest_session', '1', {
      httpOnly: false, // readable by JS so GuestGuard can clear it
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })
  }

  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  }
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
