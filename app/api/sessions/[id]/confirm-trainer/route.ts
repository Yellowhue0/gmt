import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { notifyMany } from '@/lib/notify'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.sessionConfirmedTrainer.findUnique({
    where: { sessionId_userId: { sessionId: id, userId: user.userId } },
  })

  if (existing) {
    await prisma.sessionConfirmedTrainer.delete({
      where: { sessionId_userId: { sessionId: id, userId: user.userId } },
    })
  } else {
    await prisma.sessionConfirmedTrainer.create({
      data: { sessionId: id, userId: user.userId },
    })

    const session = await prisma.gymSession.findUnique({
      where: { id },
      select: { name: true, dayOfWeek: true },
    })

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })
    const adminIds = admins.map(a => a.id).filter(aid => aid !== user.userId)

    await notifyMany(
      adminIds,
      'Tränare bekräftad',
      `${user.name} har bekräftat att de tränar ${session?.name ?? 'ett pass'}`,
      'INFO',
    )
  }

  const updated = await prisma.gymSession.findUnique({
    where: { id },
    include: {
      confirmedTrainers: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  return NextResponse.json({ data: updated })
}
