import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const currentUser = await getCurrentUser()

  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    include: {
      _count: { select: { attendees: true } },
      ...(currentUser
        ? { attendees: { where: { userId: currentUser.userId }, select: { userId: true } } }
        : {}),
    },
  })

  return NextResponse.json({ data: events })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, date, time, location, hostName, type } = body

  if (!title || !date) {
    return NextResponse.json({ error: 'Titel och datum krävs' }, { status: 400 })
  }

  const event = await prisma.event.create({
    data: {
      title,
      description: description ?? null,
      date: new Date(date),
      time: time ?? null,
      location: location ?? null,
      hostName: hostName ?? null,
      type: type ?? 'COMPETITION',
      createdById: user.userId,
    },
    include: {
      _count: { select: { attendees: true } },
    },
  })

  return NextResponse.json({ data: { ...event, attendees: [] } }, { status: 201 })
}
