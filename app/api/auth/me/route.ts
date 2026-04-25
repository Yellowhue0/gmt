import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser, verifyToken, signToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ data: null })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      avatarUrl: true,
      usernameChangesCount: true,
      membershipPaid: true,
      membershipEnd: true,
      swishNumber: true,
      phone: true,
      createdAt: true,
      isConfirmed: true,
      isLocked: true,
      lockedReason: true,
    },
  })

  if (!dbUser) return NextResponse.json({ data: null })

  // Real-time lock check — locked accounts are rejected even with valid tokens
  if (dbUser.isLocked) {
    return NextResponse.json({ error: 'locked', data: null }, { status: 403 })
  }

  // If the member has been confirmed in the DB but their JWT still says unconfirmed,
  // reissue the token so the proxy allows them through on next navigation.
  const cookieStore = await cookies()
  const rawToken = cookieStore.get('gmt-token')?.value
  if (rawToken && dbUser.isConfirmed) {
    const payload = await verifyToken(rawToken)
    if (payload && !payload.isConfirmed) {
      const newToken = await signToken({
        userId: user.userId,
        role: dbUser.role as Parameters<typeof signToken>[0]['role'],
        name: dbUser.name,
        email: dbUser.email,
        isConfirmed: true,
        isLocked: false,
      })
      const res = NextResponse.json({ data: dbUser })
      res.cookies.set('gmt-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      return res
    }
  }

  return NextResponse.json({ data: dbUser })
}
