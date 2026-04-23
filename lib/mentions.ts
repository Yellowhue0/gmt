import { prisma } from '@/lib/prisma'

export async function createMentionNotifications(
  content: string,
  mentionedUserIds: string[],
  authorId: string,
  authorName: string,
  context: string,
) {
  const uniqueIds = [...new Set(mentionedUserIds)].filter(id => id !== authorId)
  if (uniqueIds.length === 0) return

  const existing = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  })

  await prisma.notification.createMany({
    data: existing.map(u => ({
      userId: u.id,
      title: `${authorName} taggade dig`,
      message: content.length > 100 ? content.slice(0, 97) + '…' : content,
      type: 'MENTION',
    })),
    skipDuplicates: true,
  })
}
