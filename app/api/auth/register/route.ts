import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/auth/email'
import { createOpaqueToken, createSession, hashPassword, hashToken, sessionCookieOptions } from '@/lib/auth/session'
import { isRecord, publicUser, readString } from '@/lib/auth/validation'
import { getDb } from '@/lib/db'
import { emailVerifications, userAccounts } from '@/lib/db/schema'
import { allowRegistrationAttempt, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Please submit a valid registration form.' }, { status: 400 })
  }
  if (!isRecord(payload)) return NextResponse.json({ error: 'Please submit a valid registration form.' }, { status: 400 })

  // Checked before any real work: registration is the entry point that
  // grants AI-analysis credits (once the email is verified), so it's the
  // one endpoint scripted signups would target.
  const allowed = await allowRegistrationAttempt(getClientIp(request))
  if (!allowed) return NextResponse.json({ error: 'Too many accounts have been created from this network recently. Please try again later.' }, { status: 429 })

  const firstName = readString(payload, 'firstName')
  const lastName = readString(payload, 'lastName')
  const email = readString(payload, 'email').toLowerCase()
  const password = readString(payload, 'password')
  if (!firstName || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: 'Enter a first name, valid email and a password of at least 8 characters.' }, { status: 400 })
  }

  const db = getDb()
  const [existingUser] = await db.select({ id: userAccounts.id }).from(userAccounts).where(eq(userAccounts.email, email)).limit(1)
  if (existingUser) return NextResponse.json({ error: 'An account with this email already exists. Please log in instead.' }, { status: 409 })

  const passwordHash = await hashPassword(password)
  const [user] = await db
    .insert(userAccounts)
    .values({ firstName, lastName: lastName || null, email, passwordHash })
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
  if (!user) return NextResponse.json({ error: 'We could not create your account. Please try again.' }, { status: 500 })

  // The 10 beta credits are granted on email verification instead of here —
  // see app/api/auth/verify-email/route.ts — so a script can't harvest them
  // just by POSTing throwaway addresses to this endpoint.
  const verificationToken = createOpaqueToken()
  await db.insert(emailVerifications).values({
    userId: user.id,
    tokenHash: hashToken(verificationToken),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  })
  try {
    await sendVerificationEmail(user.email, verificationToken)
  } catch {
    // The account is still created if the email provider is temporarily unavailable.
  }

  const token = await createSession(user.id)
  const cookieStore = await cookies()
  cookieStore.set('joeyclub_session', token, sessionCookieOptions)
  return NextResponse.json({ user: await publicUser(user) }, { status: 201 })
}
