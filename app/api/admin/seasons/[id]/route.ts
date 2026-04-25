import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { notifyMany } from '@/lib/notify'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  if (action === 'end') {
    // Get top 3 from this season's leaderboard
    const top3 = await prisma.seasonLeaderboard.findMany({
      where: { seasonId: id },
      orderBy: { points: 'desc' },
      take: 3,
      include: { user: { select: { id: true, name: true } } },
    })

    // Set rank on top 3
    for (let i = 0; i < top3.length; i++) {
      await prisma.seasonLeaderboard.update({
        where: { id: top3[i].id },
        data: { rank: i + 1 },
      })
    }

    const topThreeData = top3.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      name: row.user.name,
      points: row.points,
    }))

    // End the season
    const season = await prisma.season.update({
      where: { id },
      data: {
        isActive: false,
        topThree: JSON.stringify(topThreeData),
      },
    })

    // Reset currentSeasonPoints for all users
    await prisma.user.updateMany({ data: { currentSeasonPoints: 0 } })

    await logAudit({
      action: 'SEASON_ENDED',
      performedBy: user.userId,
      details: `Season ended: ${season.name}`,
    })

    // Notify all confirmed members
    const allUsers = await prisma.user.findMany({
      where: { isConfirmed: true },
      select: { id: true },
    })
    const userIds = allUsers.map(u => u.id)

    const podiumLines = topThreeData
      .map(w => `${w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'} ${w.rank}st: ${w.name} – ${w.points} points`)
      .join('\n')

    await notifyMany(
      userIds,
      `🏆 ${season.name} has ended!`,
      `${podiumLines}\nCongratulations to our top members!`,
      'ACHIEVEMENT',
    )

    return NextResponse.json({ data: season })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const { id } = await params
  await prisma.season.delete({ where: { id } })

  return NextResponse.json({ data: 'ok' })
}
