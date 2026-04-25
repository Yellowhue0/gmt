import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const CHECK_IN_MILESTONES = [1, 5, 10, 20, 50, 100, 200, 500]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser, allBadges, userBadges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        totalPoints: true,
        currentSeasonPoints: true,
        attendanceStreak: true,
        longestStreak: true,
        _count: { select: { checkIns: true } },
      },
    }),
    prisma.badge.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.userBadge.findMany({
      where: { userId: user.userId },
      include: { badge: true },
    }),
  ])

  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const earnedMap = new Map(userBadges.map(ub => [ub.badgeId, ub]))

  const badges = allBadges.map(badge => {
    const earned = earnedMap.get(badge.id)
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      isSecret: badge.isSecret,
      earned: !!earned,
      earnedAt: earned?.earnedAt ?? null,
      userBadgeId: earned?.id ?? null,
    }
  })

  // Next check-in milestone for progress bar
  const totalCheckIns = dbUser._count.checkIns
  const nextMilestone = CHECK_IN_MILESTONES.find(m => m > totalCheckIns) ?? null
  const prevMilestone = [...CHECK_IN_MILESTONES].reverse().find(m => m <= totalCheckIns) ?? 0
  const progressPct = nextMilestone
    ? Math.round(((totalCheckIns - prevMilestone) / (nextMilestone - prevMilestone)) * 100)
    : 100

  return NextResponse.json({
    data: {
      totalPoints: dbUser.totalPoints,
      currentSeasonPoints: dbUser.currentSeasonPoints,
      attendanceStreak: dbUser.attendanceStreak,
      longestStreak: dbUser.longestStreak,
      totalCheckIns,
      badges,
      nextMilestone,
      prevMilestone,
      progressPct,
    },
  })
}
