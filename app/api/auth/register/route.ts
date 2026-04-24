import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'
import { notifyMany } from '@/lib/notify'

export async function POST(request: Request) {
  const { name, email, password, swishNumber, phone } = await request.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Namn, e-post och lösenord krävs' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Lösenordet måste vara minst 8 tecken' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'E-postadressen är redan registrerad' }, { status: 400 })
  }

  const hashed = await hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      swishNumber: swishNumber || null,
      phone: phone || null,
      isConfirmed: false,
    },
  })

  await logAudit({
    action: 'ACCOUNT_CREATED',
    performedBy: user.id,
    targetUser: user.id,
    details: `Account created for ${user.email}`,
    ipAddress: getIp(request),
  })

  // Notify all admins and trainers about new pending member
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'TRAINER'] } },
    select: { id: true },
  })
  if (staff.length > 0) {
    await notifyMany(
      staff.map(s => s.id),
      'Ny väntande medlem',
      `${user.name} har registrerat sig och väntar på bekräftelse.`,
      'INFO',
    )
  }

  const token = await signToken({
    userId: user.id,
    role: user.role as 'MEMBER' | 'TRAINER' | 'ADMIN',
    name: user.name,
    email: user.email,
    isConfirmed: false,
    isLocked: false,
  })

  const response = NextResponse.json(
    { data: { id: user.id, name: user.name, email: user.email, role: user.role, isConfirmed: false } },
    { status: 201 }
  )
  response.cookies.set('gmt-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
