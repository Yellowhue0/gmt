import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'
import { notify } from '@/lib/notify'

// POST — confirm member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, isConfirmed: true } })
  if (!target) return NextResponse.json({ error: 'Användaren hittades inte' }, { status: 404 })
  if (target.isConfirmed) return NextResponse.json({ error: 'Kontot är redan bekräftat' }, { status: 400 })

  await prisma.user.update({
    where: { id },
    data: {
      isConfirmed: true,
      confirmedAt: new Date(),
      confirmedBy: actor.userId,
    },
  })

  await logAudit({
    action: 'MEMBER_CONFIRMED',
    performedBy: actor.userId,
    targetUser: id,
    details: `${target.name} bekräftades av ${actor.name}`,
    ipAddress: getIp(request),
  })

  await notify(
    id,
    'Välkommen!',
    'Ditt konto har bekräftats. Du har nu full tillgång till gymmet.',
    'INFO',
  )

  return NextResponse.json({ data: 'ok' })
}

// DELETE — reject member (deletes account)
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

  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } })
  if (!target) return NextResponse.json({ error: 'Användaren hittades inte' }, { status: 404 })

  await prisma.checkIn.deleteMany({ where: { userId: id } })
  await prisma.comment.deleteMany({ where: { authorId: id } })
  await prisma.post.deleteMany({ where: { authorId: id } })
  await prisma.notification.deleteMany({ where: { userId: id } })
  await prisma.user.delete({ where: { id } })

  await logAudit({
    action: 'MEMBER_REJECTED',
    performedBy: actor.userId,
    targetUser: id,
    details: reason
      ? `Nekade ${target.name} (${target.email}). Anledning: ${reason}`
      : `Nekade ${target.name} (${target.email})`,
    ipAddress: getIp(request),
  })

  return NextResponse.json({ data: 'ok' })
}
