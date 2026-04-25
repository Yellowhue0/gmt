import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'gmt-secret-change-in-production-2025'
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('gmt-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)

    // Locked accounts: clear cookie and send to login
    if (payload.isLocked) {
      const res = NextResponse.redirect(new URL('/login', request.url))
      res.cookies.set('gmt-token', '', { maxAge: 0, path: '/' })
      return res
    }

    const isStaff = ['ADMIN', 'TRAINER', 'FINANCE'].includes(payload.role as string)

    // Unconfirmed accounts: only the pending page is allowed (staff are exempt)
    if (!payload.isConfirmed && !isStaff && pathname !== '/dashboard/pending') {
      return NextResponse.redirect(new URL('/dashboard/pending', request.url))
    }

    // Confirmed accounts (or staff) should not linger on the pending page
    if ((payload.isConfirmed || isStaff) && pathname === '/dashboard/pending') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard/admin') && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (
      pathname.startsWith('/dashboard/trainer') &&
      payload.role !== 'TRAINER' &&
      payload.role !== 'ADMIN'
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/community', '/events', '/schema'],
}
