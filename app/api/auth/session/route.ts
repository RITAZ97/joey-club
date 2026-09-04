import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ user: await getCurrentUser() })
}
