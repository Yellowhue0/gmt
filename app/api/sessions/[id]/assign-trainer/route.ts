import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { DAY_NAMES } from '@/lib/utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const { trainerId } = await request.json()

  // TRAINER can only assign themselves
  if (user.role === 'TRAINER' && trainerId !== user.userId) {
    return NextResponse.json({ error: 'Tränare kan bara tilldela sig själv' }, { status: 403 })
  }

  const session = await prisma.gymSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  await prisma.sessionAssignedTrainer.upsert({
    where: { sessionId_userId: { sessionId: id, userId: trainerId } },
    create: { sessionId: id, userId: trainerId, assignedBy: user.userId },
    update: {},
  })

  // Notify trainer if assigned by someone else (admin)
  if (trainerId !== user.userId) {
    const dayLabel = DAY_NAMES[session.dayOfWeek] ?? 'okänd dag'
    await prisma.notification.create({
      data: {
        userId: trainerId,
        title: 'Ny tilldelning',
        message: `Du har tilldelats att träna "${session.name}" på ${dayLabel} kl ${session.startTime}`,
        type: 'INFO',
      },
    })
  }

  return NextResponse.json({ data: 'ok' }, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const { trainerId } = await request.json()

  // TRAINER can only remove themselves
  if (user.role === 'TRAINER' && trainerId !== user.userId) {
    return NextResponse.json({ error: 'Tränare kan bara ta bort sig själv' }, { status: 403 })
  }

  const session = await prisma.gymSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  await prisma.sessionAssignedTrainer.deleteMany({ where: { sessionId: id, userId: trainerId } })

  // If trainer removed themselves, notify all admins
  if (trainerId === user.userId) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    const dayLabel = DAY_NAMES[session.dayOfWeek] ?? 'okänd dag'
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Tränare borttagen',
          message: `${user.name} har tagit bort sig från "${session.name}" på ${dayLabel}`,
          type: 'WARNING',
        },
      })
    }
  }

  return NextResponse.json({ data: 'ok' })
}
