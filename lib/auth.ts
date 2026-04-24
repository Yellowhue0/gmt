import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'gmt-secret-change-in-production-2025'
)

export type UserPayload = {
  userId: string
  role: 'MEMBER' | 'TRAINER' | 'FIGHTER' | 'FINANCE' | 'ADMIN' | 'PARENT' | 'JUNIOR'
  name: string
  email: string
  isConfirmed?: boolean
  isLocked?: boolean
}

export async function signToken(payload: UserPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const store = await cookies()
  const token = store.get('gmt-token')?.value
  if (!token) return null
  return verifyToken(token)
}
