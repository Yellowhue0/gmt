import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getTodayString } from '@/lib/utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'TRAINER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { id } = await params
  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? getTodayString()

  const checkIns = await prisma.checkIn.findMany({
    where: { sessionId: id, date },
    include: { user: { select: { id: true, name: true, membershipPaid: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: checkIns })
}
