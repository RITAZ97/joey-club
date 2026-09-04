import { and, eq, gt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { hashToken } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { emailVerifications, userAccounts } from '@/lib/db/schema'

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token')
  const redirectUrl = new URL('/', request.url)
  if (!token) {
    redirectUrl.searchParams.set('emailVerification', 'invalid')
    return NextResponse.redirect(redirectUrl)
  }

  const db = getDb()
  const [verification] = await db
    .select({ id: emailVerifications.id, userId: emailVerifications.userId })
    .from(emailVerifications)
    .where(and(eq(emailVerifications.tokenHash, hashToken(token)), gt(emailVerifications.expiresAt, new Date())))
    .limit(1)
  if (!verification) {
    redirectUrl.searchParams.set('emailVerification', 'invalid')
    return NextResponse.redirect(redirectUrl)
  }

  await db.update(userAccounts).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(userAccounts.id, verification.userId))
  await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id))
  redirectUrl.searchParams.set('emailVerification', 'success')
  return NextResponse.redirect(redirectUrl)
}
