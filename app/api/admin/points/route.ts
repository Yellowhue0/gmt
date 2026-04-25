import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { awardPoints } from '@/lib/points'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })

  const { userId, points, reason } = await req.json()

  if (!userId || !points || !reason?.trim()) {
    return NextResponse.json({ error: 'userId, points och reason krävs' }, { status: 400 })
  }

  const pts = parseInt(points, 10)
  if (isNaN(pts) || pts <= 0 || pts > 10000) {
    return NextResponse.json({ error: 'Ogiltigt antal poäng' }, { status: 400 })
  }

  await awardPoints({
    userId,
    points: pts,
    reason: `Admin bonus: ${reason}`,
    awardedBy: user.userId,
  })

  return NextResponse.json({ data: 'ok' })
}
