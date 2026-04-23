import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const { content, category } = await request.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Innehåll krävs' }, { status: 400 })
  }

  const pinned = user.role === 'ADMIN' || user.role === 'TRAINER'
    ? false
    : false

  const post = await prisma.post.create({
    data: {
      content: content.trim(),
      category: category ?? 'GENERAL',
      authorId: user.userId,
      pinned: false,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  })

  return NextResponse.json({ data: post }, { status: 201 })
}
