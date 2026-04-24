import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'

// POST — check a child in to today's session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { id } = await params
  const child = await prisma.childMember.findUnique({ where: { id } })
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  const isAdmin = ['ADMIN', 'TRAINER'].includes(user.role)
  if (!isAdmin && child.parentId !== user.userId) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId saknas' }, { status: 400 })

  const session = await prisma.gymSession.findUnique({ where: { id: sessionId } })
  if (!session || !session.isActive || session.isCancelled) {
    return NextResponse.json({ error: 'Sessionen hittades inte' }, { status: 404 })
  }

  const today = getTodayString()
  const todayDow = new Date().getDay()

  if (session.isRecurring) {
    if (session.dayOfWeek !== todayDow) {
      return NextResponse.json({ error: 'Denna klass är inte idag' }, { status: 400 })
    }
  } else {
    const sessionDate = session.specificDate?.toISOString().split('T')[0]
    if (sessionDate !== today) {
      return NextResponse.json({ error: 'Denna klass är inte idag' }, { status: 400 })
    }
  }

  const existing = await prisma.childCheckIn.findUnique({
    where: { childId_sessionId_date: { childId: id, sessionId, date: today } },
  })
  if (existing) return NextResponse.json({ error: 'Redan incheckad' }, { status: 400 })

  const checkIn = await prisma.childCheckIn.create({
    data: { childId: id, sessionId, date: today },
  })

  return NextResponse.json({ data: checkIn }, { status: 201 })
}

// DELETE — check out a child
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { id } = await params
  const child = await prisma.childMember.findUnique({ where: { id } })
  if (!child) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  const isAdmin = ['ADMIN', 'TRAINER'].includes(user.role)
  if (!isAdmin && child.parentId !== user.userId) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { sessionId } = await request.json()
  const today = getTodayString()

  await prisma.childCheckIn.deleteMany({
    where: { childId: id, sessionId, date: today },
  })

  return NextResponse.json({ data: 'ok' })
}
