import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSession, sessionCookieOptions, verifyPassword } from '@/lib/auth/session'
import { isRecord, publicUser, readString } from '@/lib/auth/validation'
import { getDb } from '@/lib/db'
import { userAccounts } from '@/lib/db/schema'

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Please enter your email and password.' }, { status: 400 })
  }
  if (!isRecord(payload)) return NextResponse.json({ error: 'Please enter your email and password.' }, { status: 400 })

  const email = readString(payload, 'email').toLowerCase()
  const password = readString(payload, 'password')
  const [user] = await getDb()
    .select({
      id: userAccounts.id,
      firstName: userAccounts.firstName,
      lastName: userAccounts.lastName,
      email: userAccounts.email,
      passwordHash: userAccounts.passwordHash,
      occupation: userAccounts.occupation,
      yearLevel: userAccounts.yearLevel,
      country: userAccounts.country,
      onboardingComplete: userAccounts.onboardingComplete,
    })
    .from(userAccounts)
    .where(eq(userAccounts.email, email))
    .limit(1)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  const token = await createSession(user.id)
  const cookieStore = await cookies()
  cookieStore.set('joeyclub_session', token, sessionCookieOptions)
  const { passwordHash: _passwordHash, ...publicAccount } = user
  return NextResponse.json({ user: publicUser(publicAccount) })
}
