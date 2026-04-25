import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { awardBadge } from '@/lib/badges'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const badges = await prisma.badge.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
  return NextResponse.json({ data: badges })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const { userId, badgeName, note } = await req.json()
  if (!userId || !badgeName) {
    return NextResponse.json({ error: 'userId och badgeName krävs' }, { status: 400 })
  }

  await awardBadge(userId, badgeName, user.userId, note)
  return NextResponse.json({ data: 'ok' })
}
