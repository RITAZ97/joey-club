import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/auth/email'
import { createVerificationCode, getCurrentUser, hashToken } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { emailVerifications } from '@/lib/db/schema'

const RESEND_COOLDOWN_MS = 60 * 1000

export async function POST(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
  if (currentUser.emailVerified) return NextResponse.json({ error: 'Your email is already verified.' }, { status: 400 })

  const db = getDb()
  const [lastCode] = await db
    .select({ createdAt: emailVerifications.createdAt })
    .from(emailVerifications)
    .where(eq(emailVerifications.userId, currentUser.id))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1)
  if (lastCode && Date.now() - lastCode.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Please wait a moment before requesting another code.' }, { status: 429 })
  }

  await db.delete(emailVerifications).where(eq(emailVerifications.userId, currentUser.id))
  const code = createVerificationCode()
  await db.insert(emailVerifications).values({
    userId: currentUser.id,
    tokenHash: hashToken(code),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  })
  try {
    await sendVerificationEmail(currentUser.email, code)
  } catch {
    return NextResponse.json({ error: 'The email could not be sent. Please try again shortly.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
