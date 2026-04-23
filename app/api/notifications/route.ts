import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ data: notifications })
}

export async function PATCH() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: user.userId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ data: 'ok' })
}
