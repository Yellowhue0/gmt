import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { editMode = 'this', trainerIds, recurringDays, date, ...fields } = body

  const sessionFields: Record<string, unknown> = { ...fields }
  if (date !== undefined) {
    sessionFields.specificDate = date ? new Date(date) : null
  }
  // Remove any fields not in schema
  delete sessionFields.recurringDays
  delete sessionFields.date

  if (editMode === 'all') {
    const session = await prisma.gymSession.findUnique({ where: { id } })
    if (!session?.seriesId) {
      return NextResponse.json({ error: 'Ingen series-koppling' }, { status: 400 })
    }

    await prisma.gymSession.updateMany({
      where: { seriesId: session.seriesId },
      data: sessionFields,
    })

    if (trainerIds !== undefined) {
      const groupSessions = await prisma.gymSession.findMany({
        where: { seriesId: session.seriesId },
        select: { id: true },
      })
      for (const s of groupSessions) {
        await prisma.sessionAssignedTrainer.deleteMany({ where: { sessionId: s.id } })
        if (trainerIds.length > 0) {
          await prisma.sessionAssignedTrainer.createMany({
            data: trainerIds.map((uid: string) => ({
              sessionId: s.id,
              userId: uid,
              assignedBy: user.userId,
            })),
            skipDuplicates: true,
          })
        }
      }
    }

    return NextResponse.json({ data: 'ok' })
  }

  // Edit just this session
  await prisma.gymSession.update({ where: { id }, data: sessionFields })

  if (trainerIds !== undefined) {
    await prisma.sessionAssignedTrainer.deleteMany({ where: { sessionId: id } })
    if (trainerIds.length > 0) {
      await prisma.sessionAssignedTrainer.createMany({
        data: trainerIds.map((uid: string) => ({
          sessionId: id,
          userId: uid,
          assignedBy: user.userId,
        })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json({ data: 'ok' })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const deleteMode = searchParams.get('deleteMode') ?? 'this'

  const session = await prisma.gymSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  if (deleteMode === 'all' && session.seriesId) {
    const sessions = await prisma.gymSession.findMany({
      where: { seriesId: session.seriesId },
      select: { id: true },
    })
    const ids = sessions.map((s) => s.id)
    await prisma.checkIn.deleteMany({ where: { sessionId: { in: ids } } })
    await prisma.sessionAssignedTrainer.deleteMany({ where: { sessionId: { in: ids } } })
    await prisma.sessionConfirmedTrainer.deleteMany({ where: { sessionId: { in: ids } } })
    await prisma.gymSession.deleteMany({ where: { seriesId: session.seriesId } })
  } else {
    await prisma.checkIn.deleteMany({ where: { sessionId: id } })
    await prisma.sessionAssignedTrainer.deleteMany({ where: { sessionId: id } })
    await prisma.sessionConfirmedTrainer.deleteMany({ where: { sessionId: id } })
    await prisma.gymSession.delete({ where: { id } })
  }

  return NextResponse.json({ data: 'ok' })
}
