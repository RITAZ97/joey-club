import { and, eq, gt, isNull } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSession, hashPassword, hashToken, sessionCookieOptions } from '@/lib/auth/session'
import { isRecord, readString } from '@/lib/auth/validation'
import { getDb } from '@/lib/db'
import { passwordResetTokens, userAccounts, userSessions } from '@/lib/db/schema'

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Please enter a new password.' }, { status: 400 }) }
  if (!isRecord(payload)) return NextResponse.json({ error: 'Please enter a new password.' }, { status: 400 })
  const token = readString(payload, 'token')
  const password = readString(payload, 'password')
  if (!token || password.length < 8) return NextResponse.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 })

  const db = getDb()
  const [resetToken] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), gt(passwordResetTokens.expiresAt, new Date()), isNull(passwordResetTokens.usedAt)))
    .limit(1)
  if (!resetToken) return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })

  await db.update(userAccounts).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(userAccounts.id, resetToken.userId))
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id))
  await db.delete(userSessions).where(eq(userSessions.userId, resetToken.userId))
  const sessionToken = await createSession(resetToken.userId)
  const cookieStore = await cookies()
  cookieStore.set('joeyclub_session', sessionToken, sessionCookieOptions)
  return NextResponse.json({ ok: true })
}
