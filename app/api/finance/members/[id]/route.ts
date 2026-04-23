import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'

function isAuthorized(role: string) {
  return role === 'ADMIN' || role === 'FINANCE'
}

const MEMBER_SELECT = {
  id: true,
  name: true,
  membershipPaid: true,
  membershipStart: true,
  membershipEnd: true,
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser()
  if (!actor || !isAuthorized(actor.role)) {
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

  const updated = await prisma.user.update({ where: { id }, data, select: MEMBER_SELECT })
  return NextResponse.json({ data: updated })
}
