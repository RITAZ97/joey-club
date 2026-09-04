import { GoogleGenAI } from '@google/genai'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { resourceReviews, resources, sources, type NewVerifiedResource } from '@/lib/db/schema'

/** Gemini on Vertex AI is the sole model family used for discovery, verification, and tagging. */
const DEFAULT_REVIEW_MODEL = 'gemini-2.5-flash-lite'
/**
 * A discovery run can inspect a wider set of zero-AI sitemap candidates. The
 * caller still controls the number of pages it actually imports.
 */
const MAX_DISCOVERY_RESULTS = 60
const MAX_SITEMAP_FILES_PER_DOMAIN = 8
const MAX_URLS_PER_DOMAIN = 120
const MAX_PAGE_TEXT_CHARACTERS = 12000
const MAX_AI_PAGE_TEXT_CHARACTERS = 2200
const MIN_AI_REVIEW_CONFIDENCE = 70

const PLATFORM_AGE_STAGES = ['0 - 3 yrs (Babies & Toddlers)', '3 - 5 yrs (Kinders & Preschoolers)'] as const
const PLATFORM_TOPICS = ['First Nations Culture', 'Cultures & Festivals', 'Sustainability & Nature', 'Social-Emotional Wellbeing'] as const
const EYLF_OUTCOME_BY_NUMBER = {
  1: 'Outcome 1: Children have a strong sense of identity',
  2: 'Outcome 2: Children are connected with and contribute to their world',
  3: 'Outcome 3: Children have a strong sense of wellbeing',
  4: 'Outcome 4: Children are confident and involved learners',
  5: 'Outcome 5: Children are effective communicators',
} as const

type PlatformAgeStage = (typeof PLATFORM_AGE_STAGES)[number]
type PlatformTopic = (typeof PLATFORM_TOPICS)[number]

interface EnabledSource {
  id: string
  name: string
  allowedDomains: string[]
  sourceType: string
  requiresManualReview: boolean
}

export interface DiscoveredActivity {
  title: string
  url: string
  sourceName: string
  discoveryReason: string
}

export interface SourceLinkedInput {
  title?: string
  description?: string
  discoveryReason?: string
}

interface AiResourceReview {
  title: string
  description: string
  ageStage: PlatformAgeStage
  setting: string
  activityType: string
  topic: PlatformTopic
  eylfOutcome: string | null
  learningArea: string
  format: string
  materials: string[]
  stepsSummary: string
  confidenceScore: number
  verdict: 'approved' | 'needs_review' | 'rejected'
  reviewReason: string
}

export interface ImportedActivity {
  id: string
  title: string
  sourceName: string
  status: 'source_linked' | 'approved' | 'needs_review' | 'rejected'
  confidenceScore: number
  aiReviewed: boolean
  inputTokens: number | null
  outputTokens: number | null
}

function getVertexAiClient(): GoogleGenAI {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim()
  if (!project) throw new Error('GOOGLE_CLOUD_PROJECT is not configured for Vertex AI.')

  return new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global',
  })
}

function getReviewModel(): string {
  return process.env.GEMINI_REVIEW_MODEL?.trim() || DEFAULT_REVIEW_MODEL
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') throw new Error(`AI response field '${fieldName}' must be a string.`)
  return value.trim()
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) return null
  return readString(value, fieldName)
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`AI response field '${fieldName}' must be a string array.`)
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0)
}

function readOneOf<T extends readonly string[]>(value: unknown, fieldName: string, allowedValues: T): T[number] {
  const parsed = readString(value, fieldName)
  if (!allowedValues.includes(parsed)) {
    throw new Error(`AI response field '${fieldName}' must be one of: ${allowedValues.join(', ')}.`)
  }
  return parsed as T[number]
}

function readInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`AI response field '${fieldName}' must be an integer.`)
  }
  return value
}

function getHost(url: string): string {
  return new URL(url).hostname.toLowerCase()
}

function matchesDomain(host: string, domain: string): boolean {
  const normalizedDomain = domain.toLowerCase()
  return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`)
}

function findSourceForUrl(url: string, enabledSources: EnabledSource[]): EnabledSource | null {
  const host = getHost(url)
  return enabledSources.find((source) => source.allowedDomains.some((domain) => matchesDomain(host, domain))) ?? null
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function decodeXml(value: string): string {
  return decodeHtmlEntities(value).trim()
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—', hellip: '…',
  }

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (entity, decimalCode, hexCode, namedCode) => {
    if (typeof decimalCode === 'string' && decimalCode) return String.fromCodePoint(Number(decimalCode))
    if (typeof hexCode === 'string' && hexCode) return String.fromCodePoint(Number.parseInt(hexCode, 16))
    if (typeof namedCode === 'string') return namedEntities[namedCode.toLowerCase()] ?? entity
    return entity
  })
}

function parseSitemapLocations(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi), (match) => decodeXml(match[1] ?? ''))
    .filter((location) => location.startsWith('https://') || location.startsWith('http://'))
}

function isSitemapUrl(url: string): boolean {
  return /(?:sitemap|wp-sitemap).*\.xml(?:\?.*)?$/i.test(url)
}

async function fetchText(url: string, maxLength: number): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'JoeyClubResourceIndexer/0.1 (+https://joeyclub.example)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  })

  if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`)
  return (await response.text()).slice(0, maxLength)
}

interface PreflightPage {
  canonicalUrl: string
  html: string
  text: string
  title: string | null
  description: string | null
}

function isConcreteActivityUrl(url: string): boolean {
  const parsed = new URL(url)
  const normalizedPath = parsed.pathname.replace(/\/+$/, '').toLowerCase()
  if (!normalizedPath) return false
  return !/(?:^|\/)(?:login|sign-in|signin|account|cart|checkout|search|webinar|webinars|publisher|publishers|curriculums?|learning-areas|about|careers|blog|sitemap)(?:\/|$)/.test(normalizedPath)
}

/**
 * Sitemap files often contain home pages, category indexes and unrelated
 * school-age material. These source-specific paths keep candidate discovery
 * restricted to pages that can plausibly be an individual resource.
 */
function isDirectResourceCandidate(url: string, source: EnabledSource): boolean {
  if (!isConcreteActivityUrl(url)) return false

  const parsed = new URL(url)
  const path = parsed.pathname.toLowerCase()
  const host = parsed.hostname.toLowerCase()

  if (source.name === 'Twinkl Australia') return /\/resource\//.test(path)
  if (source.name === 'Teachers Pay Teachers') return /\/product\//.test(path)
  if (source.name === 'Teach Starter') return /\/teaching-resource(?:-|\/)/.test(path)
  if (source.name === 'STEMeez') return /\.pdf$/.test(path)
  if (source.name === 'ABC Kids') return /\/abckids\/(?:early-education|programs)\//.test(path) && /\d{6,}/.test(path)
  if (source.name === 'YouTube Kids') return (host === 'youtube.com' || host.endsWith('.youtube.com')) && path === '/watch' && parsed.searchParams.has('v')
  if (source.name === 'Raising Children Network') return /\/(?:toddlers|preschoolers)\/.+\/(?:play-learning|activities|development)\//.test(path)
  if (source.name === 'Early Childhood Australia') return /\/wp-content\/uploads\/.+\.pdf$/.test(path)
  if (source.name === 'Playgroup NSW') return /^\/experiences\/[^/]+\/?$/.test(path)
  if (source.name === 'CBeebies') return /^\/(?:play|make|watch)\/[^/]+\/?$/.test(path)
  return false
}

function isLikelyEarlyLearningActivity(page: Pick<PreflightPage, 'canonicalUrl' | 'title' | 'description'>, source: EnabledSource): boolean {
  const path = new URL(page.canonicalUrl).pathname.toLowerCase()
  // Playgroup NSW exposes a dedicated, public Play Activities detail route.
  // It places the useful description and age fields in page body markup rather
  // than reliably in its HTML meta description, so the generic meta-keyword
  // check would otherwise reject real activities before we can read the body.
  if (source.name === 'Playgroup NSW' && /^\/experiences\/[^/]+\/?$/.test(path)) return true

  const reference = `${page.canonicalUrl} ${page.title ?? ''} ${page.description ?? ''}`.toLowerCase()
  if (/(?:\btrends\b|trends\/articles|music-stream|live-stream|\bnews\b|\bpodcast\b)/.test(reference)) return false
  return /(activity|activities|lesson|resource|worksheet|guide|template|teaching|early[ -]education|early[ -]learning|play[ -]school|preschool|kindergarten|toddler|story|rhyme|song|dance|movement|craft|science|stem|sensory|nature|garden)/.test(reference)
}

async function preflightActivityPage(inputUrl: string, enabledSources: EnabledSource[]): Promise<PreflightPage> {
  const response = await fetch(inputUrl, {
    headers: { 'User-Agent': 'JoeyClubResourceIndexer/0.2 (+https://joeyclub.example)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`Preflight failed with HTTP ${response.status}.`)

  const canonicalUrl = new URL(response.url).toString()
  if (!isConcreteActivityUrl(canonicalUrl)) throw new Error('Preflight rejected a source homepage, sign-in page, or search page.')
  const source = findSourceForUrl(canonicalUrl, enabledSources)
  if (!source) throw new Error('Preflight redirect left the JoeyClub source whitelist.')

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('text/html')) throw new Error('Preflight requires an HTML activity page with readable metadata.')

  const html = (await response.text()).slice(0, 500000)
  const text = textFromHtml(html)
  const title = titleFromHtml(html)
  const description = htmlMetadata(html, 'name', 'description') ?? htmlMetadata(html, 'property', 'og:description')
  if (!title && !description) throw new Error('Preflight found no usable page title or description.')
  const page = { canonicalUrl, html, text, title: title ? decodeHtmlEntities(title) : null, description: description ? decodeHtmlEntities(description) : null }
  if (!isLikelyEarlyLearningActivity(page, source)) throw new Error('Preflight rejected a non-activity or generic media page.')

  return page
}

async function sitemapCandidatesForDomain(domain: string): Promise<string[]> {
  const sitemapQueue = new Set<string>([`https://${domain}/sitemap.xml`])

  try {
    const robotsText = await fetchText(`https://${domain}/robots.txt`, 50000)
    for (const match of robotsText.matchAll(/^sitemap:\s*(\S+)$/gim)) {
      const sitemapUrl = match[1]?.trim()
      if (sitemapUrl) sitemapQueue.add(sitemapUrl)
    }
  } catch {
    // Some sources do not expose robots.txt. The conventional sitemap URL remains a safe fallback.
  }

  const visitedSitemaps = new Set<string>()
  const activityUrls = new Set<string>()

  while (sitemapQueue.size > 0 && visitedSitemaps.size < MAX_SITEMAP_FILES_PER_DOMAIN) {
    const sitemapUrl = sitemapQueue.values().next().value
    if (typeof sitemapUrl !== 'string') break
    sitemapQueue.delete(sitemapUrl)
    if (visitedSitemaps.has(sitemapUrl)) continue
    visitedSitemaps.add(sitemapUrl)

    try {
      const xml = await fetchText(sitemapUrl, 1000000)
      for (const location of parseSitemapLocations(xml)) {
        if (isSitemapUrl(location)) {
          sitemapQueue.add(location)
          continue
        }

        if (matchesDomain(getHost(location), domain)) activityUrls.add(location)
        if (activityUrls.size >= MAX_URLS_PER_DOMAIN) break
      }
    } catch {
      // A sitemap can be unavailable or non-public. Continue with other declared sitemap URLs.
    }
  }

  return [...activityUrls]
}

function queryKeywords(query: string): string[] {
  const ignored = new Set(['about', 'activities', 'activity', 'aged', 'and', 'australian', 'children', 'childhood', 'early', 'for', 'from', 'into', 'play', 'the', 'with', 'years'])
  return query
    .toLowerCase()
    .match(/[a-z]{3,}/g)
    ?.filter((word) => !ignored.has(word)) ?? []
}

function scoreCandidateUrl(url: string, keywords: string[]): number {
  const text = decodeURIComponent(url).toLowerCase()
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0)
}

function titleFromUrl(url: string): string {
  const lastSegment = new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? 'Activity resource'
  return decodeURIComponent(lastSegment).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function textFromHtml(html: string): string {
  return decodeHtmlEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
    .slice(0, MAX_PAGE_TEXT_CHARACTERS)
}

function htmlMetadata(html: string, attribute: 'name' | 'property', key: string): string | null {
  const expression = new RegExp(`<meta[^>]+${attribute}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
  const reverseExpression = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${key}["'][^>]*>`, 'i')
  const match = html.match(expression) ?? html.match(reverseExpression)
  return match?.[1] ? decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim() : null
}

function titleFromHtml(html: string): string | null {
  const socialTitle = htmlMetadata(html, 'property', 'og:title') ?? htmlMetadata(html, 'name', 'twitter:title')
  if (socialTitle) return socialTitle
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return title ? decodeHtmlEntities(title).replace(/\s+/g, ' ').trim() : null
}

function explicitEylfOutcome(text: string): string | null {
  const firstMatch = text.match(/(?:EYLF|Early Years Learning Framework)[\s\S]{0,100}?(?:Learning\s+)?Outcome\s*([1-5])\b/i)
    ?? text.match(/(?:Learning\s+)?Outcome\s*([1-5])\b[\s\S]{0,100}?(?:EYLF|Early Years Learning Framework)/i)
  const outcomeNumber = firstMatch?.[1] as keyof typeof EYLF_OUTCOME_BY_NUMBER | undefined
  return outcomeNumber === undefined ? null : EYLF_OUTCOME_BY_NUMBER[outcomeNumber]
}

function hasSourceClassificationSignals(text: string): boolean {
  return /(?:EYLF|Early Years Learning Framework|ages?\s*\d|years?\s*old|toddler|infant|baby|preschool|kindergarten|music|dance|story|phonics|sensory|science|stem|garden|nature|craft|art|outdoor)/i.test(text)
}

function inferActivityType(text: string): string {
  const value = text.toLowerCase()
  if (/(song|dance|music|rhyme|movement)/.test(value)) return 'Music & Movement'
  if (/(story|book|read|language|phonics)/.test(value)) return 'Literacy & Storytelling'
  if (/(garden|nature|outdoor|environment|recycl|sustainab)/.test(value)) return 'Outdoor & Physical Play'
  if (/(sensory|playdough|messy|water play)/.test(value)) return 'Sensory & Messy Play'
  if (/(science|stem|experiment|engineering|build)/.test(value)) return 'STEM'
  return 'Arts & Crafts'
}

function inferTopic(text: string): PlatformTopic {
  const value = text.toLowerCase()
  if (/(aboriginal|torres strait|first nations|naidoc|reconciliation|indigenous)/.test(value)) return 'First Nations Culture'
  if (/(christmas|lunar new year|diwali|easter|halloween|festival|multicultural|language|cultur)/.test(value)) return 'Cultures & Festivals'
  if (/(nature|garden|environment|recycl|sustainab|compost|outdoor)/.test(value)) return 'Sustainability & Nature'
  return 'Social-Emotional Wellbeing'
}

function inferSetting(text: string): string {
  return /(home|family|parent|carer|caregiver|one-to-one|individual)/i.test(text) ? 'Individual (1-on-1)' : 'Group'
}

function inferAgeStage(text: string): PlatformAgeStage {
  return /(baby|babies|toddler|infant|(?:ages?\s*)?[0-2]\s*(?:[-–]|to)\s*3|birth to three|under 3)/i.test(text)
    ? '0 - 3 yrs (Babies & Toddlers)'
    : '3 - 5 yrs (Kinders & Preschoolers)'
}

function normaliseSetting(setting: string, supportingText: string): string {
  if (/(individual|one-to-one|at-home|home|family|parent|carer|caregiver)/i.test(`${setting} ${supportingText}`)) {
    return 'Individual (1-on-1)'
  }
  return 'Group'
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanSourcePageTitle(title: string, sourceName: string): string {
  const sourceSuffix = new RegExp(`\\s*(?:\\||–|—|-)\\s*${escapeRegularExpression(sourceName)}\\s*$`, 'i')
  return title.replace(sourceSuffix, '').trim()
}

function playgroupAgeStage(pageText: string): PlatformAgeStage | null {
  const ageRange = pageText.match(/\bAge Range:\s*(0\s*(?:-|–)\s*3|3\s*(?:-|–)\s*5)\s*years?/i)?.[1]
  if (ageRange === undefined) return null
  return ageRange.replace(/\s+/g, '') === '0-3'
    ? '0 - 3 yrs (Babies & Toddlers)'
    : '3 - 5 yrs (Kinders & Preschoolers)'
}

function playgroupDescription(pageText: string): string | null {
  const description = pageText.match(/\bDescription:\s*(.+?)(?=\s+(?:Age Range|Duration|Energy|Skills|Clean Up):)/i)?.[1]
  return description?.trim() || null
}

function sourceLinkedFallback(inputUrl: string, source: EnabledSource, input: SourceLinkedInput, pageHtml: string): AiResourceReview {
  const pageTitle = titleFromHtml(pageHtml)
  const pageDescription = htmlMetadata(pageHtml, 'name', 'description') ?? htmlMetadata(pageHtml, 'property', 'og:description')
  const pageText = textFromHtml(pageHtml)
  const rawTitle = pageTitle || input.title?.trim() || titleFromUrl(inputUrl)
  const title = cleanSourcePageTitle(rawTitle, source.name)
  const sourcedDescription = source.name === 'Playgroup NSW' ? playgroupDescription(pageText) : null
  const description = sourcedDescription || pageDescription || input.description?.trim() || `Open this Source-linked early-learning resource from ${source.name}.`
  const referenceText = `${title} ${description}`
  const classificationText = `${referenceText} ${pageText}`

  return {
    title,
    description,
    ageStage: source.name === 'Playgroup NSW' ? playgroupAgeStage(pageText) ?? inferAgeStage(referenceText) : inferAgeStage(referenceText),
    setting: source.sourceType === 'parenting-education' ? 'Individual (1-on-1)' : inferSetting(referenceText),
    activityType: inferActivityType(classificationText),
    topic: inferTopic(classificationText),
    eylfOutcome: explicitEylfOutcome(classificationText),
    learningArea: 'Social & Emotional Learning',
    format: /youtube|video|watch/i.test(inputUrl) ? 'Video / Audio Resource' : 'Lesson Plan / Activity Guide',
    materials: [],
    stepsSummary: '',
    confidenceScore: 50,
    verdict: 'needs_review',
    reviewReason: 'Source-linked from an enabled JoeyClub domain. Metadata and AI tags may be refined later.',
  }
}

async function getEnabledSources(): Promise<EnabledSource[]> {
  return getDb()
    .select({
      id: sources.id,
      name: sources.name,
      allowedDomains: sources.allowedDomains,
      sourceType: sources.sourceType,
      requiresManualReview: sources.requiresManualReview,
    })
    .from(sources)
    .where(eq(sources.isEnabled, true))
}

function parseJsonOutput(outputText: string, responseLabel: string): unknown {
  const trimmed = outputText.trim()
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  const firstObject = trimmed.indexOf('{')
  const lastObject = trimmed.lastIndexOf('}')
  const objectSlice = firstObject >= 0 && lastObject > firstObject ? trimmed.slice(firstObject, lastObject + 1) : null
  const candidates = [trimmed, fencedJson, objectSlice].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown
    } catch {
      // Gemini occasionally wraps otherwise valid JSON in a short natural-language preface.
    }
  }

  throw new Error(`${responseLabel} did not contain valid JSON.`)
}

function parseDiscovery(outputText: string): DiscoveredActivity[] {
  const parsed = parseJsonOutput(outputText, 'AI discovery response')
  if (!isRecord(parsed) || !Array.isArray(parsed.activities)) throw new Error('AI discovery response has an invalid shape.')

  return parsed.activities.map((activity) => {
    if (!isRecord(activity)) throw new Error('AI discovery item has an invalid shape.')
    return {
      title: readString(activity.title, 'title'),
      url: readString(activity.url, 'url'),
      sourceName: readString(activity.sourceName, 'sourceName'),
      discoveryReason: readString(activity.discoveryReason, 'discoveryReason'),
    }
  })
}

function discoveryFromGroundingMetadata(response: unknown, enabledSources: EnabledSource[]): DiscoveredActivity[] {
  if (!isRecord(response) || !Array.isArray(response.candidates)) return []

  const seenUrls = new Set<string>()
  const discovered: DiscoveredActivity[] = []

  for (const candidate of response.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.groundingMetadata)) continue
    const chunks = candidate.groundingMetadata.groundingChunks
    if (!Array.isArray(chunks)) continue

    for (const chunk of chunks) {
      if (!isRecord(chunk) || !isRecord(chunk.web) || typeof chunk.web.uri !== 'string') continue
      const url = chunk.web.uri
      if (!isHttpUrl(url)) continue

      const source = findSourceForUrl(url, enabledSources)
      if (!source) continue

      const normalizedUrl = new URL(url).toString()
      if (seenUrls.has(normalizedUrl)) continue
      seenUrls.add(normalizedUrl)

      discovered.push({
        title: typeof chunk.web.title === 'string' && chunk.web.title.trim() ? chunk.web.title.trim() : titleFromUrl(url),
        url: normalizedUrl,
        sourceName: source.name,
        discoveryReason: 'Found through Gemini Google Search grounding.',
      })
    }
  }

  return discovered
}

function parseReview(outputText: string): AiResourceReview {
  const parsed = parseJsonOutput(outputText, 'AI review response')
  if (!isRecord(parsed)) throw new Error('AI review response has an invalid shape.')

  const verdict = readString(parsed.verdict, 'verdict')
  if (verdict !== 'approved' && verdict !== 'needs_review' && verdict !== 'rejected') {
    throw new Error('AI review response has an invalid verdict.')
  }

  const confidenceScore = readInteger(parsed.confidenceScore, 'confidenceScore')
  if (confidenceScore < 0 || confidenceScore > 100) throw new Error('AI confidence score must be between 0 and 100.')

  return {
    title: readString(parsed.title, 'title'),
    description: readString(parsed.description, 'description'),
    ageStage: readOneOf(parsed.ageStage, 'ageStage', PLATFORM_AGE_STAGES),
    setting: readString(parsed.setting, 'setting'),
    activityType: readString(parsed.activityType, 'activityType'),
    topic: readOneOf(parsed.topic, 'topic', PLATFORM_TOPICS),
    eylfOutcome: readNullableString(parsed.eylfOutcome, 'eylfOutcome'),
    learningArea: readString(parsed.learningArea, 'learningArea'),
    format: readString(parsed.format, 'format'),
    materials: readStringArray(parsed.materials, 'materials'),
    stepsSummary: readString(parsed.stepsSummary, 'stepsSummary'),
    confidenceScore,
    verdict,
    reviewReason: readString(parsed.reviewReason, 'reviewReason'),
  }
}

export async function discoverActivityUrls(query: string, requestedLimit = 5): Promise<DiscoveredActivity[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) throw new Error('A search query is required.')

  const limit = Math.min(Math.max(requestedLimit, 1), MAX_DISCOVERY_RESULTS)
  const enabledSources = await getEnabledSources()
  const keywords = queryKeywords(normalizedQuery)
  const candidates = await Promise.all(
    enabledSources.flatMap((source) =>
      source.allowedDomains.map(async (domain) => {
        const urls = await sitemapCandidatesForDomain(domain)
        return urls
          .filter((url) => isDirectResourceCandidate(url, source))
          .map((url) => ({
          title: titleFromUrl(url),
          url,
          sourceName: source.name,
          discoveryReason: 'Found in the source’s published sitemap.',
          score: scoreCandidateUrl(url, keywords),
          }))
      }),
    ),
  )

  return candidates
    .flat()
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ score: _score, ...activity }) => activity)
}

export async function reviewAndStoreActivityUrl(inputUrl: string, input: SourceLinkedInput = {}): Promise<ImportedActivity> {
  const requestedUrl = new URL(inputUrl).toString()
  const enabledSources = await getEnabledSources()
  if (!findSourceForUrl(requestedUrl, enabledSources)) throw new Error('The URL is not on an enabled JoeyClub whitelist domain.')

  // Layer 1: a no-AI preflight validates the final redirect, HTML response and page metadata.
  const preflight = await preflightActivityPage(requestedUrl, enabledSources)
  const normalizedUrl = preflight.canonicalUrl
  const source = findSourceForUrl(normalizedUrl, enabledSources)
  if (!source) throw new Error('The final URL is not on an enabled JoeyClub whitelist domain.')

  // Layer 2: use direct source metadata and deterministic rules before considering AI.
  const fallback = sourceLinkedFallback(normalizedUrl, source, input, preflight.html)
  let review = fallback
  let usedAiReview = false
  let inputTokens: number | null = null
  let outputTokens: number | null = null
  const hasSufficientSourceMetadata = preflight.title !== null
    && preflight.description !== null
    && hasSourceClassificationSignals(`${preflight.title} ${preflight.description} ${preflight.text}`)

  // Layer 3: only incomplete but otherwise valid activity pages go to Flash-Lite.
  if (!hasSufficientSourceMetadata && preflight.text.length >= 200) {
    try {
      const client = getVertexAiClient()
      const response = await client.models.generateContent({
        model: getReviewModel(),
        contents: `Tag this exact early-childhood resource page using only the supplied public text. URL: ${normalizedUrl}\n\nPAGE TEXT:\n${preflight.text.slice(0, MAX_AI_PAGE_TEXT_CHARACTERS)}\n\nUse no assumptions. Preserve an EYLF outcome only if this exact text explicitly names it; otherwise set eylfOutcome to null. Standardise ageStage to exactly one of: "0 - 3 yrs (Babies & Toddlers)" or "3 - 5 yrs (Kinders & Preschoolers)". topic must be one of: "First Nations Culture", "Cultures & Festivals", "Sustainability & Nature", or "Social-Emotional Wellbeing".\n\nRespond with JSON only in this exact shape: {"title":"string","description":"string","ageStage":"0 - 3 yrs (Babies & Toddlers)|3 - 5 yrs (Kinders & Preschoolers)","setting":"string","activityType":"string","topic":"First Nations Culture|Cultures & Festivals|Sustainability & Nature|Social-Emotional Wellbeing","eylfOutcome":"string|null","learningArea":"string","format":"string","materials":["string"],"stepsSummary":"string","confidenceScore":0,"verdict":"approved|needs_review|rejected","reviewReason":"string"}.`,
        config: { responseMimeType: 'application/json' },
      })
      review = parseReview(response.text ?? '')
      usedAiReview = true
      inputTokens = response.usageMetadata?.promptTokenCount ?? null
      outputTokens = response.usageMetadata?.candidatesTokenCount ?? null
    } catch {
      // Valid pages retain their deterministic source metadata if Vertex is unavailable.
    }
  }

  // Layer 4: low-confidence AI output is kept for review, but not published in Source-linked results.
  const status: ImportedActivity['status'] = usedAiReview && (review.confidenceScore < MIN_AI_REVIEW_CONFIDENCE || review.verdict !== 'approved')
    ? 'needs_review'
    : 'source_linked'
  const now = new Date()
  const values: NewVerifiedResource = {
    sourceId: source.id,
    title: review.title,
    description: review.description,
    canonicalUrl: normalizedUrl,
    ageStage: review.ageStage,
    setting: normaliseSetting(review.setting, `${review.title} ${review.description}`),
    activityType: review.activityType,
    topic: review.topic,
    eylfOutcome: review.eylfOutcome,
    learningArea: review.learningArea,
    format: review.format,
    materials: review.materials.join('\n') || null,
    stepsSummary: review.stepsSummary || null,
    metadata: { aiProvider: usedAiReview ? 'vertex-ai-gemini' : 'rules', aiModel: usedAiReview ? getReviewModel() : null, aiVerdict: review.verdict, discoveryReason: input.discoveryReason ?? null },
    status,
    reviewConfidence: review.confidenceScore,
    reviewReason: review.reviewReason,
    verifiedAt: null,
    reviewedBy: usedAiReview ? `vertex-ai:${getReviewModel()}` : 'rule-classifier',
    updatedAt: now,
  }

  const db = getDb()
  const [savedResource] = await db
    .insert(resources)
    .values(values)
    .onConflictDoUpdate({
      target: resources.canonicalUrl,
      set: values,
    })
    .returning({ id: resources.id, title: resources.title })

  if (!savedResource) throw new Error('The AI-reviewed resource could not be stored.')

  await db.insert(resourceReviews).values({
    resourceId: savedResource.id,
    decision: 'needs_changes',
    notes: `Source-linked. ${review.reviewReason}`,
    reviewerId: usedAiReview ? `vertex-ai:${getReviewModel()}` : 'rule-classifier',
    aiAssisted: usedAiReview,
  })

  return {
    id: savedResource.id,
    title: savedResource.title,
    sourceName: source.name,
    status,
    confidenceScore: review.confidenceScore,
    aiReviewed: usedAiReview,
    inputTokens,
    outputTokens,
  }
}
