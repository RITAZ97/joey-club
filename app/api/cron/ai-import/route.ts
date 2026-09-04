import { NextRequest, NextResponse } from 'next/server'
import { buildDiscoveryQuery, DISCOVERY_TOPIC_QUERIES } from '@/lib/ai/discovery-keywords'
import { discoverActivityUrls, reviewAndStoreActivityUrl, type ImportedActivity } from '@/lib/ai/resource-importer'

export const dynamic = 'force-dynamic'

const MAX_WEEKLY_CANDIDATES = 4
const REQUEST_DELAY_MS = 1500

interface ImportFailure {
  url: string
  message: string
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function getWeeklyQuery(now: Date): string {
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000
  const index = Math.floor(now.getTime() / millisecondsPerWeek) % DISCOVERY_TOPIC_QUERIES.length
  return buildDiscoveryQuery(DISCOVERY_TOPIC_QUERIES[index] ?? DISCOVERY_TOPIC_QUERIES[0])
}

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 })
  }

  if (process.env.GEMINI_IMPORT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'AI importing is disabled.' }, { status: 503 })
  }

  const query = getWeeklyQuery(new Date())
  const candidates = await discoverActivityUrls(query, MAX_WEEKLY_CANDIDATES)
  const imported: ImportedActivity[] = []
  const failures: ImportFailure[] = []

  for (const candidate of candidates) {
    await sleep(REQUEST_DELAY_MS)
    try {
      imported.push(await reviewAndStoreActivityUrl(candidate.url, candidate))
    } catch (error: unknown) {
      failures.push({
        url: candidate.url,
        message: error instanceof Error ? error.message : 'Unknown import failure.',
      })
    }
  }

  return NextResponse.json({ query, candidatesFound: candidates.length, imported, failures })
}
