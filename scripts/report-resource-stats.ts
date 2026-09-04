import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required.')

const db = drizzle({ client: neon(databaseUrl) })

async function run(): Promise<void> {
  const byAgeAndSetting = await db.execute(
    sql.raw('select status, age_stage, setting, count(*)::int as count from resources group by status, age_stage, setting order by status, age_stage, setting'),
  )
  const bySource = await db.execute(
    sql.raw("select s.name, count(*)::int as count from resources r join sources s on s.id = r.source_id where r.status in ('source_linked', 'approved') group by s.name order by count desc"),
  )
  const recentlyUpdated = await db.execute(
    sql.raw("select r.title, s.name as source, r.status, r.age_stage, r.setting, r.canonical_url, r.updated_at from resources r join sources s on s.id = r.source_id where r.status in ('source_linked', 'approved') order by r.updated_at desc limit 20"),
  )

  console.table(byAgeAndSetting.rows)
  console.table(bySource.rows)
  console.table(recentlyUpdated.rows)
}

run().catch((error: unknown) => {
  console.error('Unable to report resource statistics.', error)
  process.exitCode = 1
})
