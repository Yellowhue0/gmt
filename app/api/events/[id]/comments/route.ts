import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const authorSelect = {
  id: true,
  name: true,
  fullName: true,
  avatarUrl: true,
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const comments = await prisma.eventComment.findMany({
    where: { eventId: id, parentId: null },
    include: {
      author: { select: authorSelect },
      replies: {
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: comments })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { id } = await params
  const { content, parentId } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Kommentar krävs' }, { status: 400 })
  }

  const comment = await prisma.eventComment.create({
    data: {
      eventId: id,
      authorId: user.userId,
      content: content.trim(),
      parentId: parentId ?? null,
    },
    include: {
      author: { select: authorSelect },
      replies: { include: { author: { select: authorSelect } } },
    },
  })

  return NextResponse.json({ data: comment }, { status: 201 })
}
