import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PAGE_SIZE = 15

// Returns the ISO date string (YYYY-MM-DD) of the Monday of the week containing dateStr
function weekMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay() // 0=Sun … 6=Sat
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function calcStreaks(dates: string[]) {
  if (dates.length === 0) return { longest: 0, current: 0 }

  const mondaysSet = new Set(dates.map(weekMonday))
  const mondays = Array.from(mondaysSet).sort()

  // Longest streak
  let longest = 1
  let run = 1
  for (let i = 1; i < mondays.length; i++) {
    const diff = Math.round(
      (new Date(`${mondays[i]}T12:00:00`).getTime() -
        new Date(`${mondays[i - 1]}T12:00:00`).getTime()) /
        86_400_000,
    )
    if (diff === 7) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // Current streak — active if last trained week is this week or last week
  const todayMonday = weekMonday(new Date().toISOString().split('T')[0])
  const lastWeekMonday = addDays(todayMonday, -7)
  const lastMonday = mondays[mondays.length - 1]

  let current = 0
  if (lastMonday === todayMonday || lastMonday === lastWeekMonday) {
    current = 1
    for (let i = mondays.length - 2; i >= 0; i--) {
      const diff = Math.round(
        (new Date(`${mondays[i + 1]}T12:00:00`).getTime() -
          new Date(`${mondays[i]}T12:00:00`).getTime()) /
          86_400_000,
      )
      if (diff === 7) current++
      else break
    }
  }

  return { longest, current }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const monthFilter = url.searchParams.get('month') // 'YYYY-MM' or null

  // All check-ins (lightweight) for stat calculations
  const allRaw = await prisma.checkIn.findMany({
    where: { userId: user.userId },
    select: { date: true, session: { select: { name: true } } },
    orderBy: { date: 'asc' },
  })

  const allDates = allRaw.map(c => c.date)

  // Summary stats
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const thisMonday = weekMonday(todayStr)
  const thisSunday = addDays(thisMonday, 6)
  const monthPrefix = todayStr.slice(0, 7) // YYYY-MM

  const total = allDates.length
  const thisWeek = allDates.filter(d => d >= thisMonday && d <= thisSunday).length
  const thisMonth = allDates.filter(d => d.startsWith(monthPrefix)).length
  const firstCheckIn = allDates[0] ?? null

  // Favourite class
  const nameCounts: Record<string, number> = {}
  for (const c of allRaw) {
    nameCounts[c.session.name] = (nameCounts[c.session.name] ?? 0) + 1
  }
  const favoriteClass =
    Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const { longest: longestStreak, current: currentStreak } = calcStreaks(allDates)

  // Weekly activity — last 13 weeks
  const weeklyActivity = Array.from({ length: 13 }, (_, i) => {
    const monday = weekMonday(addDays(todayStr, -(12 - i) * 7))
    const sunday = addDays(monday, 6)
    const count = allDates.filter(d => d >= monday && d <= sunday).length
    const d = new Date(`${monday}T12:00:00`)
    const label = d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
    return { monday, count, label }
  })

  // Available months for filter dropdown (distinct YYYY-MM values, descending)
  const availableMonths = Array.from(
    new Set(allDates.map(d => d.slice(0, 7))),
  ).sort((a, b) => b.localeCompare(a))

  // Paginated history
  const historyWhere = {
    userId: user.userId,
    ...(monthFilter ? { date: { startsWith: monthFilter } } : {}),
  }

  const [historyTotal, historyItems] = await Promise.all([
    prisma.checkIn.count({ where: historyWhere }),
    prisma.checkIn.findMany({
      where: historyWhere,
      select: {
        id: true,
        date: true,
        session: {
          select: {
            name: true,
            startTime: true,
            endTime: true,
            trainer: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return NextResponse.json({
    data: {
      stats: {
        total,
        thisWeek,
        thisMonth,
        longestStreak,
        currentStreak,
        favoriteClass,
        firstCheckIn,
      },
      weeklyActivity,
      availableMonths,
      history: {
        items: historyItems,
        total: historyTotal,
        page,
        pages: Math.ceil(historyTotal / PAGE_SIZE),
      },
    },
  })
}
