import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const { id } = await params

  const ub = await prisma.userBadge.findUnique({
    where: { id },
    include: { badge: { select: { name: true } }, user: { select: { name: true } } },
  })
  if (!ub) return NextResponse.json({ error: 'Badge not found' }, { status: 404 })

  await prisma.userBadge.delete({ where: { id } })

  await logAudit({
    action: 'BADGE_REMOVED',
    performedBy: user.userId,
    targetUser: ub.userId,
    details: `Badge removed: ${ub.badge.name} from ${ub.user.name}`,
  })

  return NextResponse.json({ data: 'ok' })
}
