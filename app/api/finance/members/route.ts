import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function isAuthorized(role: string) {
  return role === 'ADMIN' || role === 'FINANCE'
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAuthorized(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const [members, children] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        swishNumber: true,
        membershipPaid: true,
        membershipStart: true,
        membershipEnd: true,
        createdAt: true,
        _count: { select: { checkIns: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.childMember.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isConfirmed: true,
        membershipPaid: true,
        membershipStart: true,
        membershipEnd: true,
        createdAt: true,
        parent: { select: { id: true, name: true, email: true } },
        _count: { select: { checkIns: true } },
      },
      orderBy: [{ parent: { name: 'asc' } }, { firstName: 'asc' }],
    }),
  ])

  const childRows = children.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.parent.email,
    role: 'JUNIOR' as const,
    swishNumber: null,
    membershipPaid: c.membershipPaid,
    membershipStart: c.membershipStart,
    membershipEnd: c.membershipEnd,
    createdAt: c.createdAt,
    _count: { checkIns: c._count.checkIns },
    parentId: c.parent.id,
    parentName: c.parent.name,
    isChild: true,
  }))

  return NextResponse.json({ data: [...members, ...childRows] })
}
