import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { sessionId, date } = await request.json()
  if (!sessionId || !date) {
    return NextResponse.json({ error: 'sessionId och date krävs' }, { status: 400 })
  }

  const session = await prisma.gymSession.findUnique({ where: { id: sessionId } })
  if (!session || !session.isActive || session.isCancelled) {
    return NextResponse.json({ error: 'Sessionen hittades inte' }, { status: 404 })
  }

  // Date must not be in the past
  const today = getTodayString()
  if (date < today) {
    return NextResponse.json({ error: 'Kan inte anmäla sig till ett passerat pass' }, { status: 400 })
  }

  const registration = await prisma.registration.upsert({
    where: { userId_sessionId_date: { userId: user.userId, sessionId, date } },
    update: {},
    create: { userId: user.userId, sessionId, date },
  })

  return NextResponse.json({ data: registration }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { sessionId, date } = await request.json()
  if (!sessionId || !date) {
    return NextResponse.json({ error: 'sessionId och date krävs' }, { status: 400 })
  }

  await prisma.registration.deleteMany({
    where: { userId: user.userId, sessionId, date },
  })

  return NextResponse.json({ data: 'ok' })
}
