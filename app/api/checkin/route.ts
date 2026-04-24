import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId saknas' }, { status: 400 })
  }

  const session = await prisma.gymSession.findUnique({ where: { id: sessionId } })
  if (!session || !session.isActive || session.isCancelled) {
    return NextResponse.json({ error: 'Sessionen hittades inte' }, { status: 404 })
  }

  const today = getTodayString()
  const todayDow = new Date().getDay()

  if (session.isRecurring) {
    if (session.dayOfWeek !== todayDow) {
      return NextResponse.json({ error: 'Denna klass är inte idag' }, { status: 400 })
    }
  } else {
    if (!session.specificDate) {
      return NextResponse.json({ error: 'Ogiltigt pass' }, { status: 400 })
    }
    const sessionDate = session.specificDate.toISOString().split('T')[0]
    if (sessionDate !== today) {
      return NextResponse.json({ error: 'Denna klass är inte idag' }, { status: 400 })
    }
  }

  const existing = await prisma.checkIn.findUnique({
    where: { userId_sessionId_date: { userId: user.userId, sessionId, date: today } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Du är redan incheckad' }, { status: 400 })
  }

  const checkIn = await prisma.checkIn.create({
    data: { userId: user.userId, sessionId, date: today },
  })

  return NextResponse.json({ data: checkIn }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { sessionId } = await request.json()
  const today = getTodayString()

  await prisma.checkIn.deleteMany({
    where: { userId: user.userId, sessionId, date: today },
  })

  return NextResponse.json({ data: 'ok' })
}
