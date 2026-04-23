import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
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

  if (body.role) data.role = body.role

  const updated = await prisma.user.update({ where: { id }, data, select: MEMBER_SELECT })
  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  await prisma.checkIn.deleteMany({ where: { userId: id } })
  await prisma.comment.deleteMany({ where: { authorId: id } })
  await prisma.post.deleteMany({ where: { authorId: id } })
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ data: 'ok' })
}
