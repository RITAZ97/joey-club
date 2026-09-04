import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { notInArray, sql } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { sources, type NewResourceSource } from '../lib/db/schema'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required. Add the Neon development branch URL to .env.local.')

/** The only sources used by the current public discovery pipeline, in priority order. */
const sourceSeeds: NewResourceSource[] = [
  { slug: 'twinkl-australia', name: 'Twinkl Australia', allowedDomains: ['twinkl.com.au', 'twinkl.com'], sourceType: 'commercial', deepLinksOnly: true, requiresManualReview: false, notes: 'Priority 1. Deep links are Source-linked immediately; retain EYLF only when the exact page explicitly states it.' },
  { slug: 'teachers-pay-teachers', name: 'Teachers Pay Teachers', allowedDomains: ['teacherspayteachers.com'], sourceType: 'marketplace', deepLinksOnly: true, requiresManualReview: false, notes: 'Priority 2. Direct product/activity details are Source-linked immediately.' },
  { slug: 'teach-starter', name: 'Teach Starter', allowedDomains: ['teachstarter.com'], sourceType: 'commercial', deepLinksOnly: true, requiresManualReview: false, notes: 'Priority 3. Direct resource pages are Source-linked immediately.' },
  { slug: 'stemeez', name: 'STEMeez', allowedDomains: ['stemeez.com.au'], sourceType: 'education-program', deepLinksOnly: true, requiresManualReview: false, notes: 'Priority 4. Direct activity PDFs are Source-linked immediately.' },
  { slug: 'abc-kids-early-education', name: 'ABC Kids', allowedDomains: ['abc.net.au', 'iview.abc.net.au'], sourceType: 'public-broadcaster', deepLinksOnly: true, requiresManualReview: false, notes: 'Priority 5. Direct early-education activity, song, movement, story or video pages are Source-linked immediately.' },
  { slug: 'youtube-kids', name: 'YouTube Kids', allowedDomains: ['youtube.com', 'youtubekids.com'], sourceType: 'video-platform', deepLinksOnly: true, requiresManualReview: false, notes: 'Priority 6. Direct official children’s education videos are Source-linked immediately.' },
  { slug: 'raising-children-network', name: 'Raising Children Network', allowedDomains: ['raisingchildren.net.au'], sourceType: 'parenting-education', deepLinksOnly: true, requiresManualReview: false, notes: 'Trusted Australian parenting source. Direct practical pages are Source-linked immediately.' },
  { slug: 'early-childhood-australia', name: 'Early Childhood Australia', allowedDomains: ['earlychildhoodaustralia.org.au'], sourceType: 'ecec-organisation', deepLinksOnly: true, requiresManualReview: false, notes: 'Trusted ECEC organisation. Specific practical resource pages are Source-linked immediately.' },
  { slug: 'playgroup-nsw', name: 'Playgroup NSW', allowedDomains: ['playgroupnsw.org.au'], sourceType: 'parenting-education', deepLinksOnly: true, requiresManualReview: false, notes: 'Trusted Australian parent resource hub. Only individual Play Activities detail pages are imported; its published 0–3 and 3–5 age filters are retained when available.' },
  { slug: 'cbeebies', name: 'CBeebies', allowedDomains: ['cbeebies.com'], sourceType: 'public-broadcaster', deepLinksOnly: true, requiresManualReview: true, notes: 'Public children’s broadcaster. Only direct play, make, or watch pages are candidates; inferred age and topic tags require a review record when the page does not state them.' },
]

async function seedSources(connectionString: string): Promise<void> {
  const db = drizzle({ client: neon(connectionString) })
  const activeSlugs = sourceSeeds.map((source) => source.slug)

  await db
    .insert(sources)
    .values(sourceSeeds)
    .onConflictDoUpdate({
      target: sources.slug,
      set: {
        name: sql`excluded.name`, allowedDomains: sql`excluded.allowed_domains`, sourceType: sql`excluded.source_type`,
        deepLinksOnly: sql`excluded.deep_links_only`, requiresManualReview: sql`excluded.requires_manual_review`,
        isEnabled: true, notes: sql`excluded.notes`, updatedAt: new Date(),
      },
    })

  await db.update(sources).set({ isEnabled: false, updatedAt: new Date() }).where(notInArray(sources.slug, activeSlugs))
  console.log(`Enabled ${sourceSeeds.length} source priorities and disabled legacy sources.`)
}

seedSources(databaseUrl).catch((error: unknown) => { console.error('Unable to seed sources.', error); process.exitCode = 1 })
