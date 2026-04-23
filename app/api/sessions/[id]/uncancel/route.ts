import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params

  const session = await prisma.gymSession.update({
    where: { id },
    data: {
      isCancelled: false,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
    },
  })

  return NextResponse.json({ data: session })
}
