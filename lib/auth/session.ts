import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { userAccounts, userSessions } from '@/lib/db/schema'

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keyLength: number) => Promise<Buffer>

export const SESSION_COOKIE_NAME = 'joeyclub_session'
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14

export type Occupation = 'teacher' | 'parent' | 'other'
export type YearLevel = '0-3' | '3-5'

export interface AuthenticatedUser {
  id: string
  firstName: string
  lastName: string | null
  email: string
  occupation: Occupation | null
  yearLevel: YearLevel | null
  country: string | null
  onboardingComplete: boolean
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: Math.floor(sessionDurationMs / 1000),
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64)
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, encodedKey] = storedHash.split(':')
  if (!salt || !encodedKey) return false

  const derivedKey = await scrypt(password, salt, 64)
  const storedKey = Buffer.from(encodedKey, 'hex')
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function createSession(userId: string): Promise<string> {
  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + sessionDurationMs)
  await getDb().insert(userSessions).values({ userId, tokenHash: hashToken(token), expiresAt })
  return token
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const [result] = await getDb()
    .select({
      id: userAccounts.id,
      firstName: userAccounts.firstName,
      lastName: userAccounts.lastName,
      email: userAccounts.email,
      occupation: userAccounts.occupation,
      yearLevel: userAccounts.yearLevel,
      country: userAccounts.country,
      onboardingComplete: userAccounts.onboardingComplete,
    })
    .from(userSessions)
    .innerJoin(userAccounts, eq(userSessions.userId, userAccounts.id))
    .where(and(eq(userSessions.tokenHash, hashToken(token)), gt(userSessions.expiresAt, new Date())))
    .limit(1)

  return result ?? null
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (token) {
    await getDb().delete(userSessions).where(eq(userSessions.tokenHash, hashToken(token)))
  }
  cookieStore.set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions, maxAge: 0 })
}
