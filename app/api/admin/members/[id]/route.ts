import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'

const MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  membershipPaid: true,
  membershipStart: true,
  membershipEnd: true,
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

  const updated = await prisma.user.update({ where: { id }, data, select: MEMBER_SELECT })
  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || actor.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  await prisma.checkIn.deleteMany({ where: { userId: id } })
  await prisma.comment.deleteMany({ where: { authorId: id } })
  await prisma.post.deleteMany({ where: { authorId: id } })
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ data: 'ok' })
}
