import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

const OK = NextResponse.json({ data: 'ok' })

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-post krävs' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Always return success to avoid email enumeration
    if (!user) return OK

    // Rate-limit: if a token was issued less than 5 minutes ago, silently skip
    if (user.resetTokenExpiry && user.resetTokenExpiry.getTime() > Date.now() + 55 * 60 * 1000) {
      return OK
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: tokenHash, resetTokenExpiry: expiry },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`

    await sendPasswordResetEmail(user.email, resetUrl)

    return OK
  } catch (err) {
    console.error('[forgot-password]', err)
    return OK
  }
}
