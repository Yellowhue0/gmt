import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'ACCOUNT_CREATED'
  | 'LOGIN'
  | 'PASSWORD_RESET'
  | 'ROLE_CHANGED'
  | 'MEMBERSHIP_UPDATED'
  | 'PAYMENT_MARKED'
  | 'PROFILE_UPDATED'
  | 'ACCOUNT_DELETED'
  | 'MEMBER_CONFIRMED'
  | 'MEMBER_REJECTED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'FIGHTER_UPDATED'
  | 'COMPETITION_ENTRY_ADDED'
  | 'COMPETITION_ENTRY_UPDATED'
  | 'COMPETITION_ENTRY_REMOVED'
  | 'POINTS_AWARDED'
  | 'BADGE_AWARDED'
  | 'BADGE_REMOVED'
  | 'SEASON_CREATED'
  | 'SEASON_ENDED'

interface LogOptions {
  action: AuditAction
  performedBy: string
  targetUser?: string
  details?: string
  ipAddress?: string
}

export async function logAudit(opts: LogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({ data: opts })
  } catch (err) {
    console.error('[audit]', err)
  }
}

export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
