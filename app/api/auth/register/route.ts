import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'
import { notifyMany } from '@/lib/notify'
import { checkAndAwardBadges } from '@/lib/badges'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, password, swishNumber, phone, registerForChild, child } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Namn, e-post och lösenord krävs' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Lösenordet måste vara minst 8 tecken' }, { status: 400 })
  }

  if (registerForChild) {
    if (!child?.firstName || !child?.lastName || !child?.dateOfBirth) {
      return NextResponse.json({ error: 'Barnets förnamn, efternamn och födelsedatum krävs' }, { status: 400 })
    }
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
      role: registerForChild ? 'PARENT' : 'MEMBER',
      isConfirmed: false,
    },
  })

  let childRecord = null
  if (registerForChild && child) {
    childRecord = await prisma.childMember.create({
      data: {
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: new Date(child.dateOfBirth),
        parentId: user.id,
        isConfirmed: false,
      },
    })
  }

  await logAudit({
    action: 'ACCOUNT_CREATED',
    performedBy: user.id,
    targetUser: user.id,
    details: registerForChild
      ? `Parent account created for ${user.email} with child ${child.firstName} ${child.lastName}`
      : `Account created for ${user.email}`,
    ipAddress: getIp(request),
  })

  // Award New Member badge
  checkAndAwardBadges({ userId: user.id, trigger: 'REGISTRATION' }).catch(() => {})

  // Notify all admins and trainers
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'TRAINER'] } },
    select: { id: true },
  })
  if (staff.length > 0) {
    const message = registerForChild
      ? `${user.name} (förälder) har registrerat sig med barn ${child.firstName} ${child.lastName} och väntar på bekräftelse.`
      : `${user.name} har registrerat sig och väntar på bekräftelse.`
    await notifyMany(staff.map(s => s.id), 'Ny väntande medlem', message)
  }

  const token = await signToken({
    userId: user.id,
    role: user.role as 'MEMBER' | 'PARENT',
    name: user.name,
    email: user.email,
    isConfirmed: false,
    isLocked: false,
  })

  const response = NextResponse.json(
    {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isConfirmed: false,
        child: childRecord
          ? { id: childRecord.id, firstName: childRecord.firstName, lastName: childRecord.lastName }
          : null,
      },
    },
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
