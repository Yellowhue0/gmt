import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function isAuthorized(role: string) {
  return role === 'ADMIN' || role === 'FINANCE'
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

  if (typeof body.membershipPaid !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const expiry = body.membershipPaid ? (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return d
  })() : null

  const updated = await prisma.user.update({
    where: { id },
    data: { membershipPaid: body.membershipPaid, membershipExpiry: expiry },
    select: {
      id: true,
      name: true,
      membershipPaid: true,
      membershipExpiry: true,
    },
  })

  return NextResponse.json({ data: updated })
}
