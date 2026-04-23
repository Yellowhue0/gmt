import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const actor = await getCurrentUser()
  if (!actor || actor.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const action = searchParams.get('action') ?? ''
  const userId = searchParams.get('userId') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const where: Record<string, unknown> = {}
  if (action) where.action = action
  if (userId) where.OR = [{ performedBy: userId }, { targetUser: userId }]
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    }
  }

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  // Resolve user names for performedBy and targetUser
  const userIds = [...new Set([
    ...entries.map(e => e.performedBy),
    ...entries.map(e => e.targetUser).filter(Boolean) as string[],
  ])]

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  const enriched = entries.map(e => ({
    ...e,
    performedByName: userMap[e.performedBy]?.name ?? e.performedBy,
    performedByEmail: userMap[e.performedBy]?.email ?? '',
    targetUserName: e.targetUser ? (userMap[e.targetUser]?.name ?? e.targetUser) : null,
    targetUserEmail: e.targetUser ? (userMap[e.targetUser]?.email ?? '') : null,
  }))

  return NextResponse.json({
    data: enriched,
    meta: { total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) },
  })
}
