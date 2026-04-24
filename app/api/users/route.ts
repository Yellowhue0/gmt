import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const roles = searchParams.get('roles')

  const where = roles
    ? { role: { in: roles.split(',') as ('MEMBER' | 'TRAINER' | 'FIGHTER' | 'FINANCE' | 'ADMIN')[] } }
    : {}

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ data: users })
}
