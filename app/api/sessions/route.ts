import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'

export async function GET() {
  const user = await getCurrentUser()
  const today = getTodayString()
  const todayDow = new Date().getDay()

  const sessions = await prisma.gymSession.findMany({
    where: { isActive: true },
    include: {
      trainer: { select: { id: true, name: true } },
      _count: { select: { checkIns: true } },
      confirmedTrainers: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  let myCheckIns: string[] = []
  let myConfirmed: string[] = []
  if (user) {
    const [checkIns, confirmed] = await Promise.all([
      prisma.checkIn.findMany({
        where: { userId: user.userId, date: today },
        select: { sessionId: true },
      }),
      prisma.sessionConfirmedTrainer.findMany({
        where: { userId: user.userId },
        select: { sessionId: true },
      }),
    ])
    myCheckIns = checkIns.map(c => c.sessionId)
    myConfirmed = confirmed.map(c => c.sessionId)
  }

  return NextResponse.json({
    data: sessions.map(s => ({
      ...s,
      isToday: s.dayOfWeek === todayDow,
      checkedIn: myCheckIns.includes(s.id),
      iAmConfirmed: myConfirmed.includes(s.id),
      checkInCount: s._count.checkIns,
    })),
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await request.json()
  const session = await prisma.gymSession.create({ data: body })
  return NextResponse.json({ data: session }, { status: 201 })
}
