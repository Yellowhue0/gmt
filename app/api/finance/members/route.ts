import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function isAuthorized(role: string) {
  return role === 'ADMIN' || role === 'FINANCE'
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAuthorized(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      swishNumber: true,
      membershipPaid: true,
      membershipStart: true,
      membershipEnd: true,
      createdAt: true,
      _count: { select: { checkIns: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ data: members })
}
