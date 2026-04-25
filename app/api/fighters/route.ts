import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
      return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
    }

    const fighters = await prisma.user.findMany({
      where: { role: 'FIGHTER' },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        fighterCardNumber: true,
        fighterCardExpiry: true,
        weightClass: true,
        currentWeight: true,
        wins: true,
        losses: true,
        draws: true,
        _count: { select: { checkIns: true } },
        competitionEntries: {
          include: {
            event: { select: { id: true, title: true, date: true, location: true } },
          },
          orderBy: { event: { date: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: fighters })
  } catch (err) {
    console.error('[GET /api/fighters]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
