import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createMentionNotifications } from '@/lib/mentions'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')

  const posts = await prisma.post.findMany({
    where: category ? { category } : undefined,
    include: {
      author: { select: { id: true, name: true, role: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ data: posts })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { content, category, mentionedUserIds = [] } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Innehåll krävs' }, { status: 400 })

  const post = await prisma.post.create({
    data: {
      content: content.trim(),
      category: category ?? 'GENERAL',
      authorId: user.userId,
      pinned: false,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  })

  if (mentionedUserIds.length > 0) {
    await createMentionNotifications(content.trim(), mentionedUserIds, user.userId, user.name, 'post')
  }

  return NextResponse.json({ data: post }, { status: 201 })
}
