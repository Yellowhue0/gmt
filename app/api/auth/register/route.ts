import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

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
    data: { name, email, password: hashed, swishNumber: swishNumber || null, phone: phone || null },
  })

  const token = await signToken({
    userId: user.id,
    role: user.role as 'MEMBER' | 'TRAINER' | 'ADMIN',
    name: user.name,
    email: user.email,
  })

  const response = NextResponse.json(
    { data: { id: user.id, name: user.name, email: user.email, role: user.role } },
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
