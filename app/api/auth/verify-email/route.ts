import { and, eq, gt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getCurrentUser, hashToken } from '@/lib/auth/session'
import { isRecord, publicUser, readString } from '@/lib/auth/validation'
import { grantSignupCredits } from '@/lib/credits'
import { getDb } from '@/lib/db'
import { emailVerifications, userAccounts } from '@/lib/db/schema'

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
  if (currentUser.emailVerified) return NextResponse.json({ user: currentUser })

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 })
  }
  if (!isRecord(payload)) return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 })

  const code = readString(payload, 'code')
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 })

  const db = getDb()
  // Scoped to this session's own account, so this can only ever verify (or
  // be brute-forced against) the account the caller is already logged into
  // — not a way to probe or unlock anyone else's account.
  const [verification] = await db
    .select({ id: emailVerifications.id })
    .from(emailVerifications)
    .where(and(eq(emailVerifications.userId, currentUser.id), eq(emailVerifications.tokenHash, hashToken(code)), gt(emailVerifications.expiresAt, new Date())))
    .limit(1)
  if (!verification) return NextResponse.json({ error: 'That code is incorrect or has expired. Request a new one and try again.' }, { status: 400 })

  const [user] = await db
    .update(userAccounts)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(userAccounts.id, currentUser.id))
    .returning({
      id: userAccounts.id,
      firstName: userAccounts.firstName,
      lastName: userAccounts.lastName,
      email: userAccounts.email,
      occupation: userAccounts.occupation,
      yearLevel: userAccounts.yearLevel,
      country: userAccounts.country,
      onboardingComplete: userAccounts.onboardingComplete,
      emailVerifiedAt: userAccounts.emailVerifiedAt,
    })
  await db.delete(emailVerifications).where(eq(emailVerifications.userId, currentUser.id))
  if (!user) return NextResponse.json({ error: 'We could not verify your email. Please try again.' }, { status: 500 })

  // The verification row is deleted above, so this only ever runs once per
  // account — safe to grant the beta credits here.
  await grantSignupCredits(user.id)
  return NextResponse.json({ user: await publicUser(user) })
}
