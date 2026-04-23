import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const comments = await prisma.comment.findMany({
    where: { postId: id },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ data: comments })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Innehåll krävs' }, { status: 400 })

  const comment = await prisma.comment.create({
    data: { content: content.trim(), postId: id, authorId: user.userId },
    include: { author: { select: { id: true, name: true, role: true } } },
  })
  return NextResponse.json({ data: comment }, { status: 201 })
}
