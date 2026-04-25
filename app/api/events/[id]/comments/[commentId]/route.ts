import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { commentId } = await params

  const comment = await prisma.eventComment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  })

  if (!comment) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })

  if (comment.authorId !== user.userId && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  await prisma.eventComment.delete({ where: { id: commentId } })
  return NextResponse.json({ data: 'ok' })
}
