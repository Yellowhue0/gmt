import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, getIp } from '@/lib/audit'

const MAX_NAME_CHANGES = 2
const MAX_BIO_LENGTH = 200

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const body = await request.json()
  const data: Record<string, unknown> = {}
  const details: string[] = []

  if (typeof body.bio === 'string') {
    if (body.bio.length > MAX_BIO_LENGTH) {
      return NextResponse.json({ error: `Bio får max vara ${MAX_BIO_LENGTH} tecken` }, { status: 400 })
    }
    data.bio = body.bio.trim() || null
    details.push('bio updated')
  }

  if (typeof body.name === 'string') {
    const newName = body.name.trim()
    if (!newName) return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })

    const current = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { usernameChangesCount: true, name: true },
    })

    if (!current) return NextResponse.json({ error: 'Användare hittades inte' }, { status: 404 })
    if (current.name === newName) return NextResponse.json({ error: 'Det är redan ditt namn' }, { status: 400 })
    if (current.usernameChangesCount >= MAX_NAME_CHANGES) {
      return NextResponse.json({ error: 'Namnbyten är slut' }, { status: 400 })
    }

    const taken = await prisma.user.findFirst({ where: { name: newName, NOT: { id: user.userId } } })
    if (taken) return NextResponse.json({ error: 'Namnet är redan taget' }, { status: 400 })

    data.name = newName
    data.usernameChangesCount = { increment: 1 }
    details.push(`username changed from "${current.name}" to "${newName}"`)
  }

  if (body.currentWeight !== undefined) {
    const w = body.currentWeight === null || body.currentWeight === '' ? null : Number(body.currentWeight)
    if (w !== null && (isNaN(w) || w < 30 || w > 300)) {
      return NextResponse.json({ error: 'Ogiltig vikt' }, { status: 400 })
    }
    data.currentWeight = w
    details.push('weight updated')
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Inget att uppdatera' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data,
    select: { id: true, name: true, bio: true, usernameChangesCount: true, currentWeight: true },
  })

  await logAudit({
    action: 'PROFILE_UPDATED',
    performedBy: user.userId,
    targetUser: user.userId,
    details: details.join('; '),
    ipAddress: getIp(request),
  })

  return NextResponse.json({ data: updated })
}
