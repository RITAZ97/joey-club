import { config } from 'dotenv'
import { buildDiscoveryQuery, DISCOVERY_TOPIC_QUERIES, type DiscoveryTopicQuery } from '../lib/ai/discovery-keywords'

config({ path: '.env.local' })

const REQUEST_DELAY_MS = 1500
const MAX_ATTEMPTS = 4

interface VerifyOptions {
  limit: number
  query: string | null
  topic: string | null
  allTopics: boolean
  dryRun: boolean
  urls: string[]
}

interface VerificationResult {
  url: string
  title: string
  status: string
  confidenceScore: number
  aiReviewed: boolean
  inputTokens: number | null
  outputTokens: number | null
}

interface VerificationFailure {
  url: string
  message: string
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /(?:429|resource_exhausted|rate limit|quota)/i.test(message)
}

async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error: unknown) {
      if (!isRateLimitError(error) || attempt === MAX_ATTEMPTS) throw error
      const backoffMs = REQUEST_DELAY_MS * (2 ** (attempt - 1))
      console.warn(`Gemini rate limit reached. Retrying in ${backoffMs / 1000}s (attempt ${attempt + 1}/${MAX_ATTEMPTS}).`)
      await sleep(backoffMs)
    }
  }

  throw new Error('Rate-limit retry loop finished unexpectedly.')
}

function parseOptions(argumentsList: string[]): VerifyOptions {
  const options: VerifyOptions = { limit: 12, query: null, topic: null, allTopics: false, dryRun: false, urls: [] }

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    const nextValue = argumentsList[index + 1]
    if (argument === '--limit' && nextValue !== undefined) {
      const requestedLimit = Number(nextValue)
      options.limit = Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 60 ? requestedLimit : 12
      index += 1
    } else if (argument === '--query' && nextValue !== undefined) {
      options.query = nextValue.trim() || null
      index += 1
    } else if (argument === '--topic' && nextValue !== undefined) {
      options.topic = nextValue.trim() || null
      index += 1
    } else if (argument === '--all-topics') {
      options.allTopics = true
    } else if (argument === '--dry-run') {
      options.dryRun = true
    } else if (argument === '--url' && nextValue !== undefined) {
      options.urls.push(nextValue)
      index += 1
    }
  }

  return options
}

function findTopic(topicName: string): DiscoveryTopicQuery | null {
  const normalizedTopic = topicName.trim().toLowerCase()
  return DISCOVERY_TOPIC_QUERIES.find((topic) => topic.topic.toLowerCase() === normalizedTopic) ?? null
}

async function run(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((argument) => argument !== '--'))
  const { discoverActivityUrls, reviewAndStoreActivityUrl } = await import('../lib/ai/resource-importer')

  const queries = options.allTopics
    ? DISCOVERY_TOPIC_QUERIES.map(buildDiscoveryQuery)
    : [options.topic === null ? options.query : buildDiscoveryQuery(findTopic(options.topic) ?? (() => { throw new Error(`Unknown topic: ${options.topic}`) })())]
  const discoveredByUrl = new Map<string, { title?: string; discoveryReason?: string }>()
  for (const url of options.urls) discoveredByUrl.set(url, {})
  if (discoveredByUrl.size === 0) {
    for (const query of queries) {
      if (!query) throw new Error('Provide --url, --query, --topic, or --all-topics.')
      const candidates = await withRateLimitRetry(() => discoverActivityUrls(query, options.limit))
      for (const candidate of candidates) {
        discoveredByUrl.set(candidate.url, { title: candidate.title, discoveryReason: candidate.discoveryReason })
      }
      await sleep(REQUEST_DELAY_MS)
    }
  }

  if (options.dryRun) {
    console.table([...discoveredByUrl.entries()].slice(0, options.limit).map(([url, discovery]) => ({
      url,
      title: discovery.title ?? '',
      discoveryReason: discovery.discoveryReason ?? '',
    })))
    console.log(`Discovered ${discoveredByUrl.size} candidate URL(s). Dry run: no pages fetched, no Vertex calls, no database writes.`)
    return
  }

  const results: VerificationResult[] = []
  const failures: VerificationFailure[] = []
  const discoveredEntries = [...discoveredByUrl.entries()]
  for (const [url, discovery] of discoveredEntries.slice(0, options.allTopics ? options.limit * DISCOVERY_TOPIC_QUERIES.length : options.limit)) {
    await sleep(REQUEST_DELAY_MS)
    try {
      const imported = await withRateLimitRetry(() => reviewAndStoreActivityUrl(url, discovery))
      results.push({
        url,
        title: imported.title,
        status: imported.status,
        confidenceScore: imported.confidenceScore,
        aiReviewed: imported.aiReviewed,
        inputTokens: imported.inputTokens,
        outputTokens: imported.outputTokens,
      })
    } catch (error: unknown) {
      failures.push({ url, message: error instanceof Error ? error.message : 'Unknown verification error.' })
    }
  }

  console.table(results)
  const aiResults = results.filter((result) => result.aiReviewed)
  const inputTokens = aiResults.reduce((total, result) => total + (result.inputTokens ?? 0), 0)
  const outputTokens = aiResults.reduce((total, result) => total + (result.outputTokens ?? 0), 0)
  console.log(`Imported ${results.length} resource(s); Vertex reviewed ${aiResults.length}; input tokens: ${inputTokens}; output tokens: ${outputTokens}.`)
  if (failures.length > 0) console.table(failures)
}

run().catch((error: unknown) => {
  console.error('Resource verification failed.', error)
  process.exitCode = 1
})
