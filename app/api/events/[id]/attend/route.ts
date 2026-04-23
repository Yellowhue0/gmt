import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const { id: eventId } = await params

  const existing = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId: user.userId } },
  })

  if (existing) {
    await prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId, userId: user.userId } },
    })
    return NextResponse.json({ data: { attending: false } })
  }

  await prisma.eventAttendee.create({
    data: { eventId, userId: user.userId },
  })
  return NextResponse.json({ data: { attending: true } })
}
