import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'
import { awardCheckInPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

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

  // Must be registered first
  const registration = await prisma.registration.findUnique({
    where: { userId_sessionId_date: { userId: user.userId, sessionId, date: today } },
  })
  if (!registration) {
    return NextResponse.json({ error: 'Du måste anmäla dig till passet innan du kan checka in' }, { status: 403 })
  }

  // Check-in only opens 15 minutes before start
  const [startH, startM] = session.startTime.split(':').map(Number)
  const [endH, endM] = session.endTime.split(':').map(Number)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  if (nowMinutes < startMinutes - 15) {
    return NextResponse.json({ error: `Incheckning öppnar ${session.startTime.slice(0, 5)} (15 min innan start)` }, { status: 400 })
  }
  if (nowMinutes > endMinutes) {
    return NextResponse.json({ error: 'Passet har redan slutat' }, { status: 400 })
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

  // Fire-and-forget: award points and badges (don't block the response)
  const now = new Date()
  Promise.all([
    awardCheckInPoints({
      userId: user.userId,
      sessionClassType: session.classType,
      sessionType: session.type,
    }),
    checkAndAwardBadges({
      userId: user.userId,
      trigger: 'CHECKIN',
      checkInTime: now,
      today,
    }),
  ]).catch(err => console.error('[checkin points/badges]', err))

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
