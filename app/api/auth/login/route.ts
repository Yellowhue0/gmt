import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-post och lösenord krävs' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Fel e-post eller lösenord' }, { status: 401 })
    }

    const valid = await compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Fel e-post eller lösenord' }, { status: 401 })
    }

    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Ditt konto har spärrats tillfälligt. Kontakta gymmet.' },
        { status: 403 }
      )
    }

    await logAudit({
      action: 'LOGIN',
      performedBy: user.id,
      targetUser: user.id,
      ipAddress: getIp(request),
    })

    const isStaff = ['ADMIN', 'TRAINER', 'FINANCE'].includes(user.role)
    const token = await signToken({
      userId: user.id,
      role: user.role as 'MEMBER' | 'TRAINER' | 'FIGHTER' | 'FINANCE' | 'ADMIN',
      name: user.name,
      email: user.email,
      isConfirmed: isStaff ? true : user.isConfirmed,
      isLocked: false,
    })

    const response = NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isConfirmed: user.isConfirmed,
      },
    })
    response.cookies.set('gmt-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[login]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
