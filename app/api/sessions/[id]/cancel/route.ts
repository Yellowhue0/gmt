import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { notifyMany } from '@/lib/notify'
import { getTodayString } from '@/lib/utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const cancellationReason: string | null = body.cancellationReason ?? null

  const session = await prisma.gymSession.update({
    where: { id },
    data: {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: user.userId,
      cancellationReason,
    },
  })

  // Notify all members checked in today
  const today = getTodayString()
  const checkIns = await prisma.checkIn.findMany({
    where: { sessionId: id, date: today },
    select: { userId: true },
  })
  const memberIds = [...new Set(checkIns.map(c => c.userId))]

  const msg = cancellationReason
    ? `${session.name} har ställts in. Anledning: ${cancellationReason}`
    : `${session.name} har ställts in.`

  await notifyMany(memberIds, 'Pass inställt', msg, 'WARNING')

  return NextResponse.json({ data: session })
}
