import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'
import { notify } from '@/lib/notify'

// POST — confirm child member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const child = await prisma.childMember.findUnique({
    where: { id },
    include: { parent: { select: { id: true, name: true } } },
  })
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })
  if (child.isConfirmed) return NextResponse.json({ error: 'Redan bekräftad' }, { status: 400 })

  await prisma.childMember.update({
    where: { id },
    data: { isConfirmed: true },
  })

  await logAudit({
    action: 'MEMBER_CONFIRMED',
    performedBy: actor.userId,
    targetUser: child.parentId,
    details: `Juniormedlem ${child.firstName} ${child.lastName} bekräftad av ${actor.name}`,
    ipAddress: getIp(request),
  })

  // Notify parent
  await notify(
    child.parentId,
    'Juniormedlem bekräftad',
    `${child.firstName} ${child.lastName} har bekräftats som juniormedlem. Ni har nu full tillgång.`,
  )

  return NextResponse.json({ data: 'ok' })
}

// DELETE — reject child member (delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const { reason } = await request.json().catch(() => ({ reason: null }))
  const child = await prisma.childMember.findUnique({ where: { id } })
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  await prisma.childCheckIn.deleteMany({ where: { childId: id } })
  await prisma.childMember.delete({ where: { id } })

  await logAudit({
    action: 'MEMBER_REJECTED',
    performedBy: actor.userId,
    targetUser: child.parentId,
    details: reason
      ? `Nekade juniormedlem ${child.firstName} ${child.lastName}. Anledning: ${reason}`
      : `Nekade juniormedlem ${child.firstName} ${child.lastName}`,
    ipAddress: getIp(request),
  })

  return NextResponse.json({ data: 'ok' })
}
