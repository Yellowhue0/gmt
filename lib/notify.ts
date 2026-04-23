import { prisma } from '@/lib/prisma'

export async function notify(
  userId: string,
  title: string,
  message: string,
  type = 'INFO',
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, title, message, type } })
  } catch (err) {
    console.error('[notify]', err)
  }
}

export async function notifyMany(
  userIds: string[],
  title: string,
  message: string,
  type = 'INFO',
): Promise<void> {
  if (!userIds.length) return
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, title, message, type })),
    })
  } catch (err) {
    console.error('[notify]', err)
  }
}
