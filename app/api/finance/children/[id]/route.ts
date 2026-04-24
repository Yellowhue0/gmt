import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'

function isAuthorized(role: string) {
  return role === 'ADMIN' || role === 'FINANCE'
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
    const child = await prisma.childMember.findUnique({ where: { id } })
    await logAudit({
      action: 'PAYMENT_MARKED',
      performedBy: actor.userId,
      targetUser: child?.parentId ?? id,
      details: `Juniormedlem ${child?.firstName ?? id}: ${body.membershipPaid ? 'PAID' : 'UNPAID'}`,
      ipAddress: ip,
    })
  }
  if (body.membershipStart !== undefined) {
    data.membershipStart = body.membershipStart ? new Date(body.membershipStart) : null
  }
  if (body.membershipEnd !== undefined) {
    data.membershipEnd = body.membershipEnd ? new Date(body.membershipEnd) : null
  }

  const updated = await prisma.childMember.update({
    where: { id },
    data,
    select: { id: true, firstName: true, lastName: true, membershipPaid: true, membershipStart: true, membershipEnd: true },
  })
  return NextResponse.json({ data: updated })
}
