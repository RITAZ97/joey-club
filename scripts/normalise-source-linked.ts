import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required.')

const db = drizzle({ client: neon(databaseUrl) })

async function run(): Promise<void> {
  const result = await db.execute(sql.raw(`
    update resources as r
    set
      setting = case
        when s.slug = 'raising-children-network'
          or concat_ws(' ', r.title, r.description, r.setting) ~* '(individual|one-to-one|at-home|home|family|parent|carer|caregiver)'
          then 'Individual (1-on-1)'
        else 'Group'
      end,
      age_stage = case
        when concat_ws(' ', r.title, r.description) ~* '(baby|babies|toddler|infant|0[[:space:]]*[-–][[:space:]]*3|birth to three|under 3)'
          then '0 - 3 yrs (Babies & Toddlers)'
        else '3 - 5 yrs (Kinders & Preschoolers)'
      end,
      updated_at = now()
    from sources as s
    where r.source_id = s.id and r.status = 'source_linked'
  `))

  console.log(`Normalised ${result.rowCount ?? 0} Source-linked resources.`)
}

run().catch((error: unknown) => {
  console.error('Unable to normalise Source-linked resources.', error)
  process.exitCode = 1
})
