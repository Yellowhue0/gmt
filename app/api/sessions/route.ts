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

  let myCheckIns: string[] = []
  let myConfirmed: string[] = []
  if (user) {
    const [checkIns, confirmed] = await Promise.all([
      prisma.checkIn.findMany({
        where: { userId: user.userId, date: today },
        select: { sessionId: true },
      }),
      prisma.sessionConfirmedTrainer.findMany({
        where: { userId: user.userId },
        select: { sessionId: true },
      }),
    ])
    myCheckIns = checkIns.map((c) => c.sessionId)
    myConfirmed = confirmed.map((c) => c.sessionId)
  }

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
        isToday: isOneTimeToday || isRecurringToday,
        checkedIn: myCheckIns.includes(s.id),
        iAmConfirmed: myConfirmed.includes(s.id),
        checkInCount: s._count.checkIns,
        trainers,
        confirmedTrainers: s.confirmedTrainers,
        attendees: user ? s.checkIns.map(c => ({ id: c.userId, name: c.user.name })) : null,
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
