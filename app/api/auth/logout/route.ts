import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ data: 'ok' })
  response.cookies.set('gmt-token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
  return response
}
