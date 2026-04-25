import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { leaderboard: true } },
    },
  })

  return NextResponse.json({ data: seasons })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const { name, startDate, endDate } = await req.json()
  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'name, startDate, endDate krävs' }, { status: 400 })
  }

  const season = await prisma.season.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    },
  })

  await logAudit({
    action: 'SEASON_CREATED',
    performedBy: user.userId,
    details: `Season created: ${name}`,
  })

  return NextResponse.json({ data: season }, { status: 201 })
}
