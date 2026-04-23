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
      membershipExpiry: true,
      swishNumber: true,
      phone: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ data: dbUser })
}
