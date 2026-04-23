import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
  const user = await getCurrentUser()
  if (!user || !isAuthorized(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}

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
  }

  if (body.membershipStart !== undefined) {
    data.membershipStart = body.membershipStart ? new Date(body.membershipStart) : null
  }

  if (body.membershipEnd !== undefined) {
    data.membershipEnd = body.membershipEnd ? new Date(body.membershipEnd) : null
  }

  const updated = await prisma.user.update({ where: { id }, data, select: MEMBER_SELECT })
  return NextResponse.json({ data: updated })
}
