import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function isAuthorized(role: string) {
  return role === 'ADMIN' || role === 'FINANCE'
}

const DAY = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör']

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAuthorized(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const [sessions, topMembers] = await Promise.all([
    prisma.gymSession.findMany({
      select: {
        id: true,
        name: true,
        dayOfWeek: true,
        startTime: true,
        type: true,
        maxCapacity: true,
        _count: { select: { checkIns: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.user.findMany({
      select: {
        name: true,
        email: true,
        role: true,
        membershipPaid: true,
        _count: { select: { checkIns: true } },
      },
      orderBy: { checkIns: { _count: 'desc' } },
      take: 10,
    }),
  ])

  const sessionsWithDay = sessions.map(s => ({
    ...s,
    dayLabel: DAY[s.dayOfWeek] ?? '?',
  }))

  return NextResponse.json({ data: { sessions: sessionsWithDay, topMembers } })
}
