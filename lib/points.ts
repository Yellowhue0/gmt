import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notify'

const POINT_MILESTONES = [100, 500, 1000, 2500, 5000]

const STREAK_BONUSES = [
  { weeks: 4,  bonus: 20 },
  { weeks: 8,  bonus: 50 },
  { weeks: 12, bonus: 100 },
]

function weekMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function calcStreaks(dates: string[]): { longest: number; current: number } {
  if (dates.length === 0) return { longest: 0, current: 0 }

  const mondaysSet = new Set(dates.map(weekMonday))
  const mondays = Array.from(mondaysSet).sort()

  let longest = 1
  let run = 1
  for (let i = 1; i < mondays.length; i++) {
    const diff = Math.round(
      (new Date(`${mondays[i]}T12:00:00`).getTime() -
        new Date(`${mondays[i - 1]}T12:00:00`).getTime()) / 86_400_000,
    )
    if (diff === 7) { run++; if (run > longest) longest = run }
    else run = 1
  }

  const todayMonday = weekMonday(new Date().toISOString().split('T')[0])
  const lastWeekMonday = addDays(todayMonday, -7)
  const lastMonday = mondays[mondays.length - 1]

  let current = 0
  if (lastMonday === todayMonday || lastMonday === lastWeekMonday) {
    current = 1
    for (let i = mondays.length - 2; i >= 0; i--) {
      const diff = Math.round(
        (new Date(`${mondays[i + 1]}T12:00:00`).getTime() -
          new Date(`${mondays[i]}T12:00:00`).getTime()) / 86_400_000,
      )
      if (diff === 7) current++
      else break
    }
  }

  return { longest, current }
}

export async function awardPoints(opts: {
  userId: string
  points: number
  reason: string
  awardedBy: string
}): Promise<void> {
  const { userId, points, reason, awardedBy } = opts

  const prevUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true },
  })

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      totalPoints: { increment: points },
      currentSeasonPoints: { increment: points },
    },
    select: { totalPoints: true },
  })

  // Update season leaderboard
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (season) {
    await prisma.seasonLeaderboard.upsert({
      where: { seasonId_userId: { seasonId: season.id, userId } },
      update: { points: { increment: points } },
      create: { seasonId: season.id, userId, points },
    })
  }

  await logAudit({
    action: 'POINTS_AWARDED',
    performedBy: awardedBy,
    targetUser: userId,
    details: `+${points} pts: ${reason}`,
  })

  // Milestone notifications
  const prev = prevUser?.totalPoints ?? 0
  for (const milestone of POINT_MILESTONES) {
    if (prev < milestone && updatedUser.totalPoints >= milestone) {
      await notify(
        userId,
        '⭐ Points milestone reached!',
        `You just reached ${milestone} points! Keep training to climb the leaderboard!`,
        'ACHIEVEMENT',
      )
    }
  }
}

export async function awardCheckInPoints(opts: {
  userId: string
  sessionClassType: string
  sessionType: string
}): Promise<void> {
  const { userId, sessionClassType, sessionType } = opts

  let points = 10
  if (sessionType === 'sparring') points = 12
  else if (sessionClassType === 'FIGHTERS_ONLY') points = 15

  await awardPoints({
    userId,
    points,
    reason: `Check-in: ${sessionType} class`,
    awardedBy: userId,
  })

  // Recalculate streak
  const allDates = await prisma.checkIn.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: 'asc' },
  })
  const dates = allDates.map(c => c.date)
  const { longest, current } = calcStreaks(dates)

  const prevUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { attendanceStreak: true, longestStreak: true },
  })
  const oldStreak = prevUser?.attendanceStreak ?? 0
  const oldLongest = prevUser?.longestStreak ?? 0

  await prisma.user.update({
    where: { id: userId },
    data: {
      attendanceStreak: current,
      longestStreak: Math.max(oldLongest, longest),
    },
  })

  // Update season leaderboard attendanceCount
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (season) {
    await prisma.seasonLeaderboard.upsert({
      where: { seasonId_userId: { seasonId: season.id, userId } },
      update: { attendanceCount: { increment: 1 } },
      create: { seasonId: season.id, userId, points: 0, attendanceCount: 1 },
    })
  }

  // Award streak bonuses if milestone crossed
  for (const { weeks, bonus } of STREAK_BONUSES) {
    if (oldStreak < weeks && current >= weeks) {
      await awardPoints({
        userId,
        points: bonus,
        reason: `${weeks}-week attendance streak bonus`,
        awardedBy: userId,
      })
    }
  }
}

export async function awardFightPoints(opts: {
  userId: string
  result: string
  awardedBy: string
}): Promise<void> {
  const { userId, result, awardedBy } = opts

  const resultUpper = result.toUpperCase()
  let points = 0
  let reason = ''

  if (resultUpper === 'WIN')  { points = 50; reason = 'Fight win' }
  else if (resultUpper === 'LOSS') { points = 20; reason = 'Fight (respect for competing)' }
  else if (resultUpper === 'DRAW') { points = 30; reason = 'Fight draw' }

  if (points > 0) {
    await awardPoints({ userId, points, reason, awardedBy })
  }
}
