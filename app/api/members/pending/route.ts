import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const actor = await getCurrentUser()
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const pending = await prisma.user.findMany({
    where: { isConfirmed: false },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: pending })
}
