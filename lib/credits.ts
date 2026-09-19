import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { creditTransactions } from '@/lib/db/schema'

export const SIGNUP_GRANT_CREDITS = 10

export async function getCreditBalance(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ balance: sql<number>`coalesce(sum(${creditTransactions.delta}), 0)` })
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
  return Number(row?.balance ?? 0)
}

export async function grantSignupCredits(userId: string): Promise<void> {
  await getDb().insert(creditTransactions).values({ userId, delta: SIGNUP_GRANT_CREDITS, reason: 'signup_grant' })
}

/**
 * Debits one credit for an AI analysis call and returns the resulting
 * balance, or null when the member has none left. The insert's WHERE clause
 * re-checks the running balance in the same statement so a single request
 * can't spend credit it doesn't have; under near-simultaneous requests from
 * the same account there is still a narrow race (Neon's HTTP driver doesn't
 * give us row locking here), but at beta scale — one member, one browser tab,
 * ten credits — that's an acceptable tradeoff rather than something to
 * architect around up front.
 */
export async function spendCreditForAnalysis(userId: string): Promise<number | null> {
  const db = getDb()
  const inserted = await db.execute(sql`
    insert into credit_transactions (user_id, delta, reason)
    select ${userId}::uuid, -1, 'card_analysis'
    where (select coalesce(sum(delta), 0) from credit_transactions where user_id = ${userId}::uuid) >= 1
    returning id
  `)
  if (inserted.rows.length === 0) return null
  return getCreditBalance(userId)
}
