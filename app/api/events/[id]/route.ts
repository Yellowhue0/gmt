import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const canManage = (role: string) => role === 'ADMIN' || role === 'TRAINER'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !canManage(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { title, description, date, time, location, hostName, type } = body

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(time !== undefined && { time }),
      ...(location !== undefined && { location }),
      ...(hostName !== undefined && { hostName }),
      ...(type !== undefined && { type }),
    },
    include: {
      _count: { select: { attendees: true } },
      attendees: { where: { userId: user.userId }, select: { userId: true } },
    },
  })

  return NextResponse.json({ data: event })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !canManage(user.role)) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  await prisma.event.delete({ where: { id } })
  return NextResponse.json({ data: 'ok' })
}
