import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'

function canSeeSession(visibility: string, classType: string, role: string | null) {
  // KIDS_ONLY classes are only for parents, trainers, and admins
  if (classType === 'KIDS_ONLY' && !['PARENT', 'TRAINER', 'ADMIN'].includes(role ?? '')) return false

  if (visibility === 'PUBLIC') return true
  if (!role) return false
  if (visibility === 'MEMBERS_ONLY') return true
  if (visibility === 'FIGHTERS_ONLY') return ['FIGHTER', 'TRAINER', 'ADMIN'].includes(role)
  if (visibility === 'TRAINERS_ONLY') return ['TRAINER', 'ADMIN'].includes(role)
  if (visibility === 'HIDDEN') return role === 'ADMIN'
  return true
}

export async function GET() {
  const user = await getCurrentUser()
  const role = user?.role ?? null

  const today = getTodayString()
  const todayDow = new Date().getDay()
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const sessions = await prisma.gymSession.findMany({
    where: {
      isActive: true,
      isCancelled: false,
      OR: [
        { isRecurring: true },
        { isRecurring: false, specificDate: { gte: todayDate } },
      ],
    },
    include: {
      trainer: { select: { id: true, name: true } },
      assignedTrainers: { include: { user: { select: { id: true, name: true } } } },
      confirmedTrainers: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { checkIns: true } },
      checkIns: {
        where: { date: today },
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  function nextOccurrenceDate(dayOfWeek: number, endTime: string): string {
    const todayDow = new Date().getDay()
    let daysUntil = (dayOfWeek - todayDow + 7) % 7
    if (daysUntil === 0) {
      const [eh, em] = endTime.split(':').map(Number)
      if (nowMinutes > eh * 60 + em) daysUntil = 7
    }
    const d = new Date()
    d.setDate(d.getDate() + daysUntil)
    return d.toISOString().split('T')[0]
  }

  let myCheckIns: string[] = []
  let myRegistrations: { sessionId: string; date: string }[] = []
  let myConfirmed: string[] = []
  if (user) {
    const [checkIns, registrations, confirmed] = await Promise.all([
      prisma.checkIn.findMany({
        where: { userId: user.userId, date: today },
        select: { sessionId: true },
      }),
      prisma.registration.findMany({
        where: { userId: user.userId, date: { gte: today } },
        select: { sessionId: true, date: true },
      }).catch(() => [] as { sessionId: string; date: string }[]),
      prisma.sessionConfirmedTrainer.findMany({
        where: { userId: user.userId },
        select: { sessionId: true },
      }),
    ])
    myCheckIns = checkIns.map((c) => c.sessionId)
    myRegistrations = registrations
    myConfirmed = confirmed.map((c) => c.sessionId)
  }

  type RegEntry = { sessionId: string; date: string; user: { id: string; name: string } }
  const allRegistrations: RegEntry[] = await prisma.registration.findMany({
    where: { date: { gte: today } },
    select: { sessionId: true, date: true, user: { select: { id: true, name: true } } },
  }).catch(() => [])

  const data = sessions
    .filter((s) => canSeeSession(s.visibility, s.classType, role))
    .map((s) => {
      // Merge legacy trainerId trainer + assigned trainers (deduplicated)
      const map = new Map<string, { id: string; name: string }>()
      if (s.trainer) map.set(s.trainer.id, s.trainer)
      s.assignedTrainers.forEach((at) => map.set(at.user.id, at.user))
      const trainers = [...map.values()]

      const isOneTimeToday =
        !s.isRecurring && s.specificDate
          ? s.specificDate.toISOString().split('T')[0] === today
          : false
      const isRecurringToday = s.isRecurring && s.dayOfWeek === todayDow
      const isToday = isOneTimeToday || isRecurringToday

      const registrationDate = s.isRecurring
        ? nextOccurrenceDate(s.dayOfWeek, s.endTime)
        : s.specificDate ? s.specificDate.toISOString().split('T')[0] : today

      const registered = myRegistrations.some(
        (r) => r.sessionId === s.id && r.date === registrationDate
      )

      const sessionRegistrants = allRegistrations.filter(
        (r) => r.sessionId === s.id && r.date === registrationDate
      )
      const registrationCount = sessionRegistrants.length
      const registrants = user ? sessionRegistrants.map((r) => r.user) : null

      const [startH, startM] = s.startTime.split(':').map(Number)
      const [endH, endM] = s.endTime.split(':').map(Number)
      const isCheckInOpen =
        isToday &&
        nowMinutes >= startH * 60 + startM - 15 &&
        nowMinutes <= endH * 60 + endM

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        dayOfWeek: s.dayOfWeek,
        date: s.specificDate ? s.specificDate.toISOString() : null,
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type,
        classType: s.classType,
        visibility: s.visibility,
        maxCapacity: s.maxCapacity,
        isActive: s.isActive,
        isRecurring: s.isRecurring,
        seriesId: s.seriesId,
        isCancelled: s.isCancelled,
        cancellationReason: s.cancellationReason,
        isToday,
        checkedIn: myCheckIns.includes(s.id),
        registered,
        registrationDate,
        isCheckInOpen,
        iAmConfirmed: myConfirmed.includes(s.id),
        checkInCount: s._count.checkIns,
        registrationCount,
        registrants,
        trainers,
        confirmedTrainers: s.confirmedTrainers,
        attendees: user ? s.checkIns.map((c) => ({ id: c.userId, name: c.user.name })) : null,
      }
    })

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await request.json()
  const {
    trainerIds = [] as string[],
    recurringDays = [] as number[],
    isRecurring = true,
    date,
    dayOfWeek,
    ...sessionData
  } = body

  if (isRecurring && recurringDays.length > 0) {
    const seriesId = crypto.randomUUID()
    const created = []

    for (const dow of recurringDays) {
      const session = await prisma.gymSession.create({
        data: {
          ...sessionData,
          dayOfWeek: dow,
          isRecurring: true,
          seriesId,
          assignedTrainers: trainerIds.length
            ? {
                create: trainerIds.map((id: string) => ({
                  userId: id,
                  assignedBy: user.userId,
                })),
              }
            : undefined,
        },
      })
      created.push(session)
    }

    for (const trainerId of trainerIds) {
      if (trainerId === user.userId) continue
      await prisma.notification.create({
        data: {
          userId: trainerId,
          title: 'Ny tilldelning',
          message: `Du har tilldelats att träna "${sessionData.name}" (återkommande)`,
          type: 'INFO',
        },
      })
    }

    return NextResponse.json({ data: created }, { status: 201 })
  }

  // Single session
  const sessionDayOfWeek =
    !isRecurring && date ? new Date(date).getDay() : ((dayOfWeek as number) ?? 1)

  const session = await prisma.gymSession.create({
    data: {
      ...sessionData,
      dayOfWeek: sessionDayOfWeek,
      specificDate: !isRecurring && date ? new Date(date) : null,
      isRecurring,
      assignedTrainers: trainerIds.length
        ? {
            create: trainerIds.map((id: string) => ({
              userId: id,
              assignedBy: user.userId,
            })),
          }
        : undefined,
    },
  })

  const dateLabel = date ? new Date(date).toLocaleDateString('sv-SE') : 'återkommande'
  for (const trainerId of trainerIds) {
    if (trainerId === user.userId) continue
    await prisma.notification.create({
      data: {
        userId: trainerId,
        title: 'Ny tilldelning',
        message: `Du har tilldelats att träna "${sessionData.name}" ${dateLabel} kl ${sessionData.startTime}`,
        type: 'INFO',
      },
    })
  }

  return NextResponse.json({ data: session }, { status: 201 })
}
