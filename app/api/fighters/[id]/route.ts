import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { notifyMany } from '@/lib/notify'

const isStaff = (role: string) => ['ADMIN', 'TRAINER'].includes(role)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  const { id } = await params

  if (!user) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  if (user.userId !== id && !isStaff(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const fighter = await prisma.user.findUnique({
    where: { id },
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
  })

  if (!fighter) return NextResponse.json({ error: 'Inte hittad' }, { status: 404 })

  return NextResponse.json({ data: fighter })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  const { id } = await params

  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await req.json()
  const { fighterCardNumber, fighterCardExpiry, weightClass, currentWeight, wins, losses, draws } = body

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(fighterCardNumber !== undefined && { fighterCardNumber: fighterCardNumber || null }),
      ...(fighterCardExpiry !== undefined && {
        fighterCardExpiry: fighterCardExpiry ? new Date(fighterCardExpiry) : null,
      }),
      ...(weightClass !== undefined && { weightClass: weightClass || null }),
      ...(currentWeight !== undefined && { currentWeight: currentWeight ? Number(currentWeight) : null }),
      ...(wins !== undefined && { wins: Number(wins) }),
      ...(losses !== undefined && { losses: Number(losses) }),
      ...(draws !== undefined && { draws: Number(draws) }),
    },
    select: {
      id: true,
      name: true,
      fighterCardNumber: true,
      fighterCardExpiry: true,
      weightClass: true,
      currentWeight: true,
      wins: true,
      losses: true,
      draws: true,
    },
  })

  await logAudit({
    action: 'FIGHTER_UPDATED',
    performedBy: user.userId,
    targetUser: id,
    details: `Fighter profile updated by ${user.name}`,
  })

  if (fighterCardExpiry) {
    const expiry = new Date(fighterCardExpiry)
    const daysLeft = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysLeft > 0 && daysLeft <= 30) {
      const staff = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'TRAINER'] }, id: { not: user.userId } },
        select: { id: true },
      })
      const dateStr = expiry.toLocaleDateString('sv-SE')
      await notifyMany(
        staff.map(s => s.id),
        'Fighterkort löper ut snart',
        `${updated.name}s fighterkort löper ut den ${dateStr}. Vänligen förnya.`,
        'WARNING',
      )
    }
  }

  return NextResponse.json({ data: updated })
}
