import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { checkAndAwardBadges } from '@/lib/badges'

const MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  membershipPaid: true,
  membershipStart: true,
  membershipEnd: true,
  isConfirmed: true,
  isLocked: true,
  lockedReason: true,
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || actor.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}
  const ip = getIp(request)

  if (typeof body.membershipPaid === 'boolean') {
    data.membershipPaid = body.membershipPaid
    if (body.membershipPaid) {
      const start = new Date()
      const end = new Date()
      end.setMonth(end.getMonth() + 3)
      data.membershipStart = start
      data.membershipEnd = end
    } else {
      data.membershipStart = null
      data.membershipEnd = null
    }
    await logAudit({
      action: 'PAYMENT_MARKED',
      performedBy: actor.userId,
      targetUser: id,
      details: body.membershipPaid ? 'Marked as PAID (dates auto-set)' : 'Marked as UNPAID (dates cleared)',
      ipAddress: ip,
    })
  }

  if (body.membershipStart !== undefined) {
    data.membershipStart = body.membershipStart ? new Date(body.membershipStart) : null
    await logAudit({
      action: 'MEMBERSHIP_UPDATED',
      performedBy: actor.userId,
      targetUser: id,
      details: `membershipStart set to ${body.membershipStart ?? 'null'}`,
      ipAddress: ip,
    })
  }

  if (body.membershipEnd !== undefined) {
    data.membershipEnd = body.membershipEnd ? new Date(body.membershipEnd) : null
    await logAudit({
      action: 'MEMBERSHIP_UPDATED',
      performedBy: actor.userId,
      targetUser: id,
      details: `membershipEnd set to ${body.membershipEnd ?? 'null'}`,
      ipAddress: ip,
    })
  }

  if (body.role) {
    const current = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    data.role = body.role
    await logAudit({
      action: 'ROLE_CHANGED',
      performedBy: actor.userId,
      targetUser: id,
      details: `Role changed from ${current?.role ?? '?'} to ${body.role}`,
      ipAddress: ip,
    })
  }

  // Lock account
  if (body.isLocked === true) {
    const reason = body.lockedReason?.trim() || null
    data.isLocked = true
    data.lockedReason = reason
    data.lockedAt = new Date()
    data.lockedBy = actor.userId
    await logAudit({
      action: 'ACCOUNT_LOCKED',
      performedBy: actor.userId,
      targetUser: id,
      details: reason ? `Låst: ${reason}` : 'Konto låst utan anledning',
      ipAddress: ip,
    })
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (target) {
      await notify(id, 'Konto spärrat', 'Ditt konto har spärrats tillfälligt. Kontakta gymmet.', 'INFO')
    }
  }

  // Unlock account
  if (body.isLocked === false) {
    data.isLocked = false
    data.lockedReason = null
    data.lockedAt = null
    data.lockedBy = null
    await logAudit({
      action: 'ACCOUNT_UNLOCKED',
      performedBy: actor.userId,
      targetUser: id,
      details: 'Konto upplåst',
      ipAddress: ip,
    })
    await notify(id, 'Konto upplåst', 'Ditt konto är nu aktivt igen.', 'INFO')
  }

  const updated = await prisma.user.update({ where: { id }, data, select: MEMBER_SELECT })

  if (body.role && ['FIGHTER', 'TRAINER'].includes(body.role)) {
    checkAndAwardBadges({ userId: id, trigger: 'ROLE_CHANGE' }).catch(() => {})
  }

  return NextResponse.json({ data: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || actor.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } })
  await prisma.checkIn.deleteMany({ where: { userId: id } })
  await prisma.comment.deleteMany({ where: { authorId: id } })
  await prisma.post.deleteMany({ where: { authorId: id } })
  await prisma.notification.deleteMany({ where: { userId: id } })
  await prisma.user.delete({ where: { id } })
  await logAudit({
    action: 'ACCOUNT_DELETED',
    performedBy: actor.userId,
    targetUser: id,
    details: target ? `Deleted account: ${target.name} (${target.email})` : `Deleted account: ${id}`,
    ipAddress: getIp(request),
  })
  return NextResponse.json({ data: 'ok' })
}
