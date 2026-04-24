import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
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

  return NextResponse.json({ data: dbUser })
}
