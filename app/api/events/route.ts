import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json({ data: events })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, date, location, type } = body

  if (!title || !date) {
    return NextResponse.json({ error: 'Titel och datum krävs' }, { status: 400 })
  }

  const event = await prisma.event.create({
    data: { title, description, date: new Date(date), location, type: type ?? 'COMPETITION' },
  })
  return NextResponse.json({ data: event }, { status: 201 })
}
