import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  const { id: fighterId } = await params

  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await req.json()
  const { eventId, weightAtEntry, opponent, notes } = body

  if (!eventId) {
    return NextResponse.json({ error: 'Tävling krävs' }, { status: 400 })
  }

  const [fighter, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: fighterId }, select: { id: true, name: true, role: true } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, date: true } }),
  ])

  if (!fighter || fighter.role !== 'FIGHTER') {
    return NextResponse.json({ error: 'Fighter hittades inte' }, { status: 404 })
  }
  if (!event) {
    return NextResponse.json({ error: 'Tävling hittades inte' }, { status: 404 })
  }

  const entry = await prisma.fighterCompetitionEntry.create({
    data: {
      fighterId,
      eventId,
      weightAtEntry: weightAtEntry ? Number(weightAtEntry) : null,
      opponent: opponent || null,
      notes: notes || null,
      enteredBy: user.userId,
    },
    include: {
      event: { select: { id: true, title: true, date: true, location: true } },
    },
  })

  await logAudit({
    action: 'COMPETITION_ENTRY_ADDED',
    performedBy: user.userId,
    targetUser: fighterId,
    details: `${fighter.name} entered into ${event.title} by ${user.name}`,
  })

  const eventDate = event.date.toLocaleDateString('sv-SE')
  await notify(
    fighterId,
    'Anmäld till tävling',
    `Du har anmälts till ${event.title} den ${eventDate} av ${user.name}.`,
    'INFO',
  )

  // Award competition entry points and check badges
  Promise.all([
    awardPoints({ userId: fighterId, points: 25, reason: `Competition entry: ${event.title}`, awardedBy: user.userId }),
    checkAndAwardBadges({ userId: fighterId, trigger: 'COMPETITION_ENTRY' }),
  ]).catch(err => console.error('[competition entry points/badges]', err))

  return NextResponse.json({ data: entry }, { status: 201 })
}
