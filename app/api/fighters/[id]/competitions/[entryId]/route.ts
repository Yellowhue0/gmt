import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { awardFightPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const user = await getCurrentUser()
  const { id: fighterId, entryId } = await params

  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await req.json()
  const { opponent, result, notes, weightAtEntry } = body

  // Get previous entry to detect result change
  const prevEntry = await prisma.fighterCompetitionEntry.findUnique({
    where: { id: entryId },
    select: { result: true, fighterId: true },
  })

  const entry = await prisma.fighterCompetitionEntry.update({
    where: { id: entryId },
    data: {
      ...(opponent !== undefined && { opponent: opponent || null }),
      ...(result !== undefined && { result: result || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(weightAtEntry !== undefined && { weightAtEntry: weightAtEntry ? Number(weightAtEntry) : null }),
    },
    include: {
      event: { select: { id: true, title: true, date: true, location: true } },
    },
  })

  await logAudit({
    action: 'COMPETITION_ENTRY_UPDATED',
    performedBy: user.userId,
    targetUser: fighterId,
    details: `Competition entry updated for fighter ${fighterId}`,
  })

  // Award result points only when result is first set
  if (result && !prevEntry?.result && prevEntry?.fighterId) {
    // Update wins/losses/draws on user
    const resultUpper = result.toUpperCase()
    if (resultUpper === 'WIN') {
      await prisma.user.update({ where: { id: fighterId }, data: { wins: { increment: 1 } } })
    } else if (resultUpper === 'LOSS') {
      await prisma.user.update({ where: { id: fighterId }, data: { losses: { increment: 1 } } })
    } else if (resultUpper === 'DRAW') {
      await prisma.user.update({ where: { id: fighterId }, data: { draws: { increment: 1 } } })
    }

    Promise.all([
      awardFightPoints({ userId: fighterId, result, awardedBy: user.userId }),
      checkAndAwardBadges({ userId: fighterId, trigger: 'FIGHT_RESULT' }),
    ]).catch(err => console.error('[fight result points/badges]', err))
  }

  return NextResponse.json({ data: entry })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const user = await getCurrentUser()
  const { id: fighterId, entryId } = await params

  if (!user || !['ADMIN', 'TRAINER'].includes(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  await prisma.fighterCompetitionEntry.delete({ where: { id: entryId } })

  await logAudit({
    action: 'COMPETITION_ENTRY_REMOVED',
    performedBy: user.userId,
    targetUser: fighterId,
    details: `Competition entry ${entryId} removed`,
  })

  return NextResponse.json({ data: 'ok' })
}
