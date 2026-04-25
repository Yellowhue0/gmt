import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const seasonId = url.searchParams.get('seasonId') // null = active season
  const roleFilter = url.searchParams.get('role')   // 'FIGHTER' or null
  const allTime = url.searchParams.get('allTime') === '1'

  // Seasons list
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, isActive: true, startDate: true, endDate: true, topThree: true },
  })

  const activeSeason = seasons.find(s => s.isActive) ?? null

  // If allTime mode, query users directly sorted by totalPoints
  if (allTime) {
    const where = roleFilter ? { role: roleFilter as 'FIGHTER' } : {}
    const users = await prisma.user.findMany({
      where: { isConfirmed: true, ...where },
      select: {
        id: true,
        name: true,
        role: true,
        totalPoints: true,
        currentSeasonPoints: true,
        attendanceStreak: true,
        _count: { select: { checkIns: true, userBadges: true } },
      },
      orderBy: { totalPoints: 'desc' },
      take: 100,
    })

    const entries = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name,
      role: u.role,
      points: u.totalPoints,
      attendanceCount: u._count.checkIns,
      badgeCount: u._count.userBadges,
      isCurrentUser: u.id === user.userId,
    }))

    const myEntry = entries.find(e => e.isCurrentUser)
    if (!myEntry) {
      const me = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true, name: true, role: true, totalPoints: true,
          _count: { select: { checkIns: true, userBadges: true } },
        },
      })
      if (me) {
        const myRank = await prisma.user.count({
          where: { isConfirmed: true, totalPoints: { gt: me.totalPoints }, ...where },
        })
        entries.push({
          rank: myRank + 1,
          userId: me.id,
          name: me.name,
          role: me.role,
          points: me.totalPoints,
          attendanceCount: me._count.checkIns,
          badgeCount: me._count.userBadges,
          isCurrentUser: true,
        })
      }
    }

    return NextResponse.json({
      data: {
        season: activeSeason,
        seasons,
        entries,
        allTime: true,
      },
    })
  }

  // Season-based leaderboard
  const targetSeasonId = seasonId ?? activeSeason?.id
  if (!targetSeasonId) {
    return NextResponse.json({ data: { season: null, seasons, entries: [], allTime: false } })
  }

  const targetSeason = seasons.find(s => s.id === targetSeasonId)

  const leaderboard = await prisma.seasonLeaderboard.findMany({
    where: {
      seasonId: targetSeasonId,
      ...(roleFilter ? { user: { role: roleFilter as 'FIGHTER' } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          attendanceStreak: true,
          _count: { select: { userBadges: true } },
        },
      },
    },
    orderBy: { points: 'desc' },
    take: 100,
  })

  const entries = leaderboard.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    name: row.user.name,
    role: row.user.role,
    points: row.points,
    attendanceCount: row.attendanceCount,
    badgeCount: row.user._count.userBadges,
    isCurrentUser: row.userId === user.userId,
  }))

  // Ensure current user appears even if outside top 100
  const myEntry = entries.find(e => e.isCurrentUser)
  if (!myEntry) {
    const myRow = await prisma.seasonLeaderboard.findUnique({
      where: { seasonId_userId: { seasonId: targetSeasonId, userId: user.userId } },
      include: {
        user: {
          select: { id: true, name: true, role: true, _count: { select: { userBadges: true } } },
        },
      },
    })
    if (myRow) {
      const myRank = await prisma.seasonLeaderboard.count({
        where: { seasonId: targetSeasonId, points: { gt: myRow.points } },
      })
      entries.push({
        rank: myRank + 1,
        userId: myRow.userId,
        name: myRow.user.name,
        role: myRow.user.role,
        points: myRow.points,
        attendanceCount: myRow.attendanceCount,
        badgeCount: myRow.user._count.userBadges,
        isCurrentUser: true,
      })
    }
  }

  return NextResponse.json({
    data: {
      season: targetSeason ?? activeSeason,
      seasons,
      entries,
      allTime: false,
    },
  })
}
