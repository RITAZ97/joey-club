import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/auth/email'
import { createOpaqueToken, hashToken } from '@/lib/auth/session'
import { isRecord, readString } from '@/lib/auth/validation'
import { getDb } from '@/lib/db'
import { passwordResetTokens, userAccounts } from '@/lib/db/schema'

const genericResponse = NextResponse.json({ ok: true })

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown
  try { payload = await request.json() } catch { return genericResponse }
  if (!isRecord(payload)) return genericResponse

  const email = readString(payload, 'email').toLowerCase()
  if (!email) return genericResponse
  const db = getDb()
  const [user] = await db.select({ id: userAccounts.id, email: userAccounts.email }).from(userAccounts).where(eq(userAccounts.email, email)).limit(1)
  if (!user) return genericResponse

  const token = createOpaqueToken()
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  })
  try {
    await sendPasswordResetEmail(user.email, token)
  } catch {
    // Preserve a generic response so callers cannot infer account state.
  }
  return genericResponse
}
