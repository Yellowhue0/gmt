import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const actor = await getCurrentUser()
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: { isConfirmed: false },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.childMember.findMany({
      where: { isConfirmed: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        parent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const pendingUsers = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
    type: 'user' as const,
  }))

  const pendingChildren = children.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.parent.email,
    createdAt: c.createdAt,
    type: 'child' as const,
    parentName: c.parent.name,
  }))

  return NextResponse.json({ data: [...pendingUsers, ...pendingChildren] })
}
