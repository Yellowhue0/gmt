import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'

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

async function getChildAndAuthorize(id: string, userId: string, role: string) {
  const child = await prisma.childMember.findUnique({ where: { id } })
  if (!child) return null
  const isStaff = ['ADMIN', 'TRAINER', 'FINANCE'].includes(role)
  const isOwner = child.parentId === userId
  if (!isStaff && !isOwner) return null
  return child
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { id } = await params
  const child = await getChildAndAuthorize(id, user.userId, user.role)
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })
  const full = await prisma.childMember.findUnique({ where: { id }, select: CHILD_SELECT })
  return NextResponse.json({ data: full })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { id } = await params
  const isAdmin = user.role === 'ADMIN'
  const child = await getChildAndAuthorize(id, user.userId, user.role)
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.firstName) data.firstName = body.firstName
  if (body.lastName) data.lastName = body.lastName
  if (body.dateOfBirth) data.dateOfBirth = new Date(body.dateOfBirth)

  if (isAdmin) {
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
        performedBy: user.userId,
        targetUser: id,
        details: `Child ${child.firstName} ${child.lastName}: ${body.membershipPaid ? 'PAID' : 'UNPAID'}`,
        ipAddress: getIp(request),
      })
    }
    if (body.membershipStart !== undefined) {
      data.membershipStart = body.membershipStart ? new Date(body.membershipStart) : null
    }
    if (body.membershipEnd !== undefined) {
      data.membershipEnd = body.membershipEnd ? new Date(body.membershipEnd) : null
    }
  }

  const updated = await prisma.childMember.update({ where: { id }, data, select: CHILD_SELECT })
  return NextResponse.json({ data: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { id } = await params
  // Only admin or the parent can delete
  const isAdmin = user.role === 'ADMIN'
  const child = await prisma.childMember.findUnique({ where: { id } })
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })
  if (!isAdmin && child.parentId !== user.userId) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  await prisma.childCheckIn.deleteMany({ where: { childId: id } })
  await prisma.childMember.delete({ where: { id } })

  await logAudit({
    action: 'ACCOUNT_DELETED',
    performedBy: user.userId,
    targetUser: id,
    details: `Deleted child member: ${child.firstName} ${child.lastName}`,
    ipAddress: getIp(request),
  })

  return NextResponse.json({ data: 'ok' })
}
