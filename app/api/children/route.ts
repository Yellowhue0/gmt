import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { notifyMany } from '@/lib/notify'

const CHILD_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  parentId: true,
  parent: { select: { id: true, name: true, email: true } },
  isConfirmed: true,
  membershipPaid: true,
  membershipStart: true,
  membershipEnd: true,
  createdAt: true,
  _count: { select: { checkIns: true } },
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const isStaff = ['ADMIN', 'TRAINER', 'FINANCE'].includes(user.role)

  const children = await prisma.childMember.findMany({
    where: isStaff ? undefined : { parentId: user.userId },
    select: CHILD_SELECT,
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: children })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const isStaff = ['ADMIN', 'TRAINER'].includes(user.role)
  const isParent = user.role === 'PARENT'
  if (!isStaff && !isParent) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { firstName, lastName, dateOfBirth, parentId } = await request.json()
  if (!firstName || !lastName || !dateOfBirth) {
    return NextResponse.json({ error: 'Förnamn, efternamn och födelsedatum krävs' }, { status: 400 })
  }

  const resolvedParentId = isStaff && parentId ? parentId : user.userId

  const child = await prisma.childMember.create({
    data: {
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      parentId: resolvedParentId,
      isConfirmed: false,
    },
    select: CHILD_SELECT,
  })

  // Notify admins/trainers about new pending child member
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'TRAINER'] } },
    select: { id: true },
  })
  if (staff.length > 0) {
    await notifyMany(
      staff.map(s => s.id),
      'Ny väntande juniormedlem',
      `${firstName} ${lastName} har lagts till som juniormedlem och väntar på bekräftelse.`,
    )
  }

  return NextResponse.json({ data: child }, { status: 201 })
}
