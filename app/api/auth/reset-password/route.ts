import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function findUserByToken(raw: string) {
  return prisma.user.findFirst({
    where: {
      resetToken: hashToken(raw),
      resetTokenExpiry: { gt: new Date() },
    },
  })
}

// GET – validate token (called by the reset-password page on mount)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token saknas' }, { status: 400 })

  const user = await findUserByToken(token)
  if (!user) return NextResponse.json({ error: 'Länken är ogiltig eller har gått ut' }, { status: 400 })

  return NextResponse.json({ data: 'ok' })
}

// POST – set new password
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token och lösenord krävs' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Lösenordet måste vara minst 8 tecken' }, { status: 400 })
    }

    const user = await findUserByToken(token)
    if (!user) return NextResponse.json({ error: 'Länken är ogiltig eller har gått ut' }, { status: 400 })

    const hashed = await hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    })

    return NextResponse.json({ data: 'ok' })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Något gick fel' }, { status: 500 })
  }
}
