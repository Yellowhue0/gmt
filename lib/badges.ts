import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notify'

function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDaysToDate(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSwedishHoliday(date: Date): boolean {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const year = date.getFullYear()

  // Fixed holidays
  if (m === 1  && d === 1)  return true  // New Year's Day
  if (m === 1  && d === 6)  return true  // Epiphany
  if (m === 5  && d === 1)  return true  // Labour Day
  if (m === 6  && d === 6)  return true  // National Day
  if (m === 12 && d === 24) return true  // Christmas Eve
  if (m === 12 && d === 25) return true  // Christmas Day
  if (m === 12 && d === 26) return true  // Boxing Day
  if (m === 12 && d === 31) return true  // New Year's Eve

  // Easter-based
  const easter = getEasterDate(year)
  if (date.toDateString() === addDaysToDate(easter, -2).toDateString()) return true // Good Friday
  if (date.toDateString() === easter.toDateString())                    return true // Easter Sunday
  if (date.toDateString() === addDaysToDate(easter, 1).toDateString())  return true // Easter Monday
  if (date.toDateString() === addDaysToDate(easter, 39).toDateString()) return true // Ascension
  if (date.toDateString() === addDaysToDate(easter, 49).toDateString()) return true // Pentecost

  // Midsommardag: first Saturday on or after June 20
  if (m === 6 && d >= 19 && d <= 26 && date.getDay() === 5) return true // Midsommarafton (Fri)
  if (m === 6 && d >= 20 && d <= 26 && date.getDay() === 6) return true // Midsommardag (Sat)

  // All Saints' Day: first Saturday on or after Oct 31
  if (m === 11 && d <= 6 && date.getDay() === 6) return true

  return false
}

async function grantBadge(userId: string, badgeName: string, awardedBy?: string, note?: string) {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName } })
  if (!badge) return

  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  })
  if (existing) return

  await prisma.userBadge.create({
    data: { userId, badgeId: badge.id, awardedBy, note },
  })

  await logAudit({
    action: 'BADGE_AWARDED',
    performedBy: awardedBy ?? userId,
    targetUser: userId,
    details: `Badge awarded: ${badge.icon} ${badge.name}`,
  })

  await notify(
    userId,
    `${badge.icon} New badge earned: ${badge.name}!`,
    `${badge.description}\nView your profile to see all your badges.`,
    'ACHIEVEMENT',
  )
}

export async function awardBadge(userId: string, badgeName: string, awardedBy?: string, note?: string) {
  await grantBadge(userId, badgeName, awardedBy, note)
}

export async function checkAndAwardBadges(opts: {
  userId: string
  trigger: 'CHECKIN' | 'COMPETITION_ENTRY' | 'FIGHT_RESULT' | 'REGISTRATION' | 'ROLE_CHANGE'
  checkInTime?: Date
  today?: string
}) {
  const { userId, trigger, checkInTime, today } = opts

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      createdAt: true,
      attendanceStreak: true,
      wins: true,
      checkIns: { select: { date: true }, orderBy: { date: 'asc' } },
      competitionEntries: { select: { id: true, result: true } },
    },
  })
  if (!user) return

  const totalCheckIns = user.checkIns.length
  const todayStr = today ?? new Date().toISOString().split('T')[0]
  const monthPrefix = todayStr.slice(0, 7)
  const checkInsThisMonth = user.checkIns.filter(c => c.date.startsWith(monthPrefix)).length
  const streak = user.attendanceStreak

  const existingBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { name: true } } },
  })
  const earned = new Set(existingBadges.map(ub => ub.badge.name))

  const grant = (name: string) => !earned.has(name) && grantBadge(userId, name)

  // Attendance badges
  if (trigger === 'CHECKIN') {
    if (totalCheckIns >= 1)   await grant('First Class')
    if (checkInsThisMonth >= 5)  await grant('On Fire')
    if (checkInsThisMonth >= 10) await grant('Dedicated')
    if (checkInsThisMonth >= 20) await grant('Unstoppable')
    if (streak >= 4)  await grant('Consistent')
    if (streak >= 8)  await grant('Committed')
    if (streak >= 12) await grant('Legend')
    if (totalCheckIns >= 100) await grant('Century')
    if (totalCheckIns >= 500) await grant('Elite')

    // Secret badges
    if (checkInTime) {
      const hour = checkInTime.getHours()
      if (hour >= 20) await grant('Night Owl')
      if (hour < 7)  await grant('Early Bird')

      const checkDate = new Date(checkInTime)
      if (isSwedishHoliday(checkDate)) await grant('Holiday Warrior')

      // Iron Will: check if any event today
      const eventsToday = await prisma.event.count({
        where: {
          date: {
            gte: new Date(`${todayStr}T00:00:00`),
            lte: new Date(`${todayStr}T23:59:59`),
          },
        },
      })
      if (eventsToday > 0) await grant('Iron Will')
    }
  }

  // Milestone badges
  if (trigger === 'REGISTRATION') {
    await grant('New Member')
  }

  if (trigger === 'ROLE_CHANGE') {
    if (user.role === 'FIGHTER') await grant('Fighter')
    if (user.role === 'TRAINER') await grant('Trainer')
  }

  // Anniversary badges (check on any trigger)
  const membershipAgeMs = Date.now() - user.createdAt.getTime()
  const membershipYears = membershipAgeMs / (365.25 * 24 * 3600 * 1000)
  if (membershipYears >= 1) await grant('Anniversary')
  if (membershipYears >= 3) await grant('Veteran')

  // Fighting badges
  if (trigger === 'COMPETITION_ENTRY' || trigger === 'FIGHT_RESULT') {
    const totalEntries = user.competitionEntries.length
    const totalWins = user.wins

    if (totalEntries >= 1) await grant('Competitor')
    if (totalEntries >= 5) await grant('Warrior')
    if (totalWins >= 1)    await grant('Victor')
    if (totalWins >= 10)   await grant('Champion')
  }
}
