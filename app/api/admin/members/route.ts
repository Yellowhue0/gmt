import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      swishNumber: true,
      phone: true,
      membershipPaid: true,
      membershipStart: true,
      membershipEnd: true,
      isConfirmed: true,
      isLocked: true,
      lockedReason: true,
      createdAt: true,
      _count: { select: { checkIns: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: members })
}
