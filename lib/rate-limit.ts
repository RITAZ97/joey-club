import { and, gt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { registrationAttempts } from '@/lib/db/schema'

const REGISTRATION_LIMIT = 3
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000

/** Vercel/most proxies set this; the first entry is the original client IP. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Returns true when this IP is still under the registration limit for the
 * current window. Each call also records this attempt, so registration
 * scripts can't rack up free-credit accounts by hammering the endpoint —
 * see the credits ledger in lib/credits.ts, which this directly protects.
 */
export async function allowRegistrationAttempt(ipAddress: string): Promise<boolean> {
  const db = getDb()
  const windowStart = new Date(Date.now() - REGISTRATION_WINDOW_MS)
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(registrationAttempts)
    .where(and(sql`${registrationAttempts.ipAddress} = ${ipAddress}`, gt(registrationAttempts.createdAt, windowStart)))
  const recentCount = Number(row?.count ?? 0)
  await db.insert(registrationAttempts).values({ ipAddress })
  return recentCount < REGISTRATION_LIMIT
}
