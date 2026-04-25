import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const [members, children] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        role: true,
        swishNumber: true,
        phone: true,
        membershipPaid: true,
        membershipStart: true,
        membershipEnd: true,
        isConfirmed: true,
        isLocked: true,
        lockedReason: true,
        createdAt: true,
        _count: { select: { checkIns: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.childMember.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        isConfirmed: true,
        membershipPaid: true,
        membershipStart: true,
        membershipEnd: true,
        createdAt: true,
        parent: { select: { id: true, name: true, email: true } },
        _count: { select: { checkIns: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const childRows = children.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.parent.email,
    role: 'JUNIOR' as const,
    swishNumber: null,
    phone: null,
    membershipPaid: c.membershipPaid,
    membershipStart: c.membershipStart,
    membershipEnd: c.membershipEnd,
    isConfirmed: c.isConfirmed,
    isLocked: false,
    lockedReason: null,
    createdAt: c.createdAt,
    _count: { checkIns: c._count.checkIns },
    parentId: c.parent.id,
    parentName: c.parent.name,
    dateOfBirth: c.dateOfBirth,
    isChild: true,
  }))

  return NextResponse.json({ data: [...members, ...childRows] })
}
