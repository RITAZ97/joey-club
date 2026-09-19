import { GoogleGenAI } from '@google/genai'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { spendCreditForAnalysis } from '@/lib/credits'

export const runtime = 'nodejs'

const NO_CREDITS_MESSAGE = "You've used all 10 of your beta credits. This is a test release with a small, fixed credit cap while we watch usage — top-ups and ways to earn more (like sharing JoeyClub) are coming soon."

const MODEL = process.env.GEMINI_REVIEW_MODEL?.trim() || 'gemini-2.5-flash-lite'
const ACTIVITY_TYPES = ['Arts & Crafts', 'STEM & Nature', 'Music / Video', 'Stories & Letters', 'Sensory & Messy Play', 'Outdoor & Physical Play'] as const
const EYLF_OUTCOMES = ['Outcome 1', 'Outcome 2', 'Outcome 3', 'Outcome 4', 'Outcome 5'] as const
const VENUE_SETTINGS = ['indoor', 'outdoor', 'mixed', 'not_applicable'] as const
const AUDIENCES = ['educator', 'parents', 'both'] as const
const EXPERIENCE_TAGS = ['Animal Encounters', 'Nature & Sustainability', 'First Nations Perspectives', 'STEM & Discovery', 'Language & Literacy', 'Arts, Music & Creativity', 'Movement & Wellbeing', 'Sensory & Hands-on', 'Social Skills & Teamwork', 'Community & Life Skills'] as const
const ERROR_TITLE = /^(?:404(?:\s+error)?|page\s+not\s+found|content\s+not\s+found|request\s+unsuccessful|something\s+went\s+wrong)\b/i

interface AnalysisResult {
  title: string
  description: string
  activityType: string
  topic: string
  age: 'All Ages' | '1–3 yrs' | '3–5 yrs'
  eylfOutcome: (typeof EYLF_OUTCOMES)[number] | null
  eylfDetail: string
  eylfEvidence: string
  location: string
  providerName: string
  providerType: string
  stateTerritory: string
  venueSetting: (typeof VENUE_SETTINGS)[number]
  audience: (typeof AUDIENCES)[number]
  experienceTags: string[]
  potentialBenefits: string[]
  practicalFeatures: string[]
  materials: string[]
  stepsSummary: string
  learningArea: string
  analysisMode: 'ai' | 'metadata'
  confidenceScore: number
  reviewReason: string
}

interface ExtractedPage {
  title: string
  description: string
  heading: string
  text: string
  canonicalUrl: string
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Please log in to analyse a link with AI.', code: 'auth_required' }, { status: 401 })

    const input = await request.json() as { url?: string; kind?: 'ideas' | 'outings' }
    const requestedUrl = await safeUrl(input.url ?? '')
    const kind = input.kind === 'outings' ? 'outings' : 'ideas'

    // Credit is spent only once the URL itself is confirmed valid, so a typo
    // or malformed link doesn't cost the member anything.
    const creditsRemaining = await spendCreditForAnalysis(user.id)
    if (creditsRemaining === null) return NextResponse.json({ error: NO_CREDITS_MESSAGE, code: 'no_credits' }, { status: 402 })

    const result = await analyseUrl(requestedUrl, kind)
    return NextResponse.json({ ...result, creditsRemaining })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The link could not be analysed.' }, { status: 422 })
  }
}

async function analyseUrl(requestedUrl: URL, kind: 'ideas' | 'outings'): Promise<AnalysisResult> {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim()
  let page: ExtractedPage
  let finalUrl: URL
  try {
    const fetched = await fetchUsablePage(requestedUrl)
    page = fetched.page
    finalUrl = fetched.finalUrl
  } catch (fetchError) {
    if (project) {
      try { return await analyseWithUrlContext(requestedUrl, kind, project) }
      catch (contextError) { console.warn('URL-context fallback failed.', contextError) }
    }
    // Some perfectly usable sites block automated readers entirely (403/429,
    // anti-bot challenges, no readable metadata). Intake must never reject
    // the link outright for that reason alone — accept it for manual
    // confirmation instead, the same way JoeySearch's intake queue does.
    console.warn('Direct fetch and URL-context both failed; accepting for manual review.', fetchError)
    return manualReviewFallback(requestedUrl, fetchError)
  }
  const fallback = inferFromEvidence(page, kind)
  if (!project) return fallback

  try {
    const client = new GoogleGenAI({ vertexai: true, project, location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global', apiVersion: 'v1' })
    const aiResponse = await client.models.generateContent({
      model: MODEL,
      contents: buildPrompt(finalUrl, page, kind),
      config: { responseMimeType: 'application/json' },
    })
    const parsed = JSON.parse(aiResponse.text ?? '{}') as Record<string, unknown>
    return validateAiResult(parsed, fallback, page)
  } catch (error) {
    console.warn('Activity-card AI enrichment failed; returning verified metadata.', error)
    return fallback
  }
}

async function analyseWithUrlContext(url: URL, kind: 'ideas' | 'outings', project: string): Promise<AnalysisResult> {
  const client = new GoogleGenAI({ vertexai: true, project, location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global', apiVersion: 'v1' })
  const prompt = `Open and review this exact public URL as an Australian early-childhood ${kind === 'outings' ? 'outing or venue' : 'learning activity'}: ${url.toString()}\n\nUse the URL Context tool, not prior knowledge. If the retrieved page is a 404/error page, return {"error":"page_not_found"}. Otherwise return the same full JSON shape described below, using only evidence actually present on the retrieved page. Do not invent unsupported details.\n\n${responseShapeInstructions(kind)}`
  const response = await client.models.generateContent({ model: MODEL, contents: prompt, config: { tools: [{ urlContext: {} }] } })
  const parsed = JSON.parse(extractJsonObject(response.text ?? '')) as Record<string, unknown>
  if (parsed.error === 'page_not_found') throw new Error('The website returned a “Page Not Found” page.')
  const slug = decodeURIComponent(url.pathname).split('/').filter(Boolean).at(-1)?.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Web resource'
  const fallback = blankResult(slug)
  const result = validateAiResult(parsed, fallback)
  if (!result.title || !result.description || result.title === slug && result.confidenceScore < 50) throw new Error('URL Context did not return enough verified page information.')
  return { ...result, analysisMode: 'ai', reviewReason: `${result.reviewReason} Retrieved through Gemini URL Context.` }
}

async function fetchUsablePage(url: URL): Promise<{ page: ExtractedPage; finalUrl: URL }> {
  const attempts = [
    'JoeySearchReview/1.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 JoeyClub/1.0',
  ]
  let lastProblem = 'The website could not be read.'

  for (const userAgent of attempts) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000), cache: 'no-store', headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-AU,en;q=0.9' } })
      // Raising Children Network permits normal browser visits but denies some
      // automated server requests. A 403/429 there is access protection, not
      // evidence the page is broken, so it is still worth reading the body.
      const isProtectedRaisingChildren = isRaisingChildren(url) && (response.status === 403 || response.status === 429)
      if (!response.ok && !isProtectedRaisingChildren) { lastProblem = `The website returned HTTP ${response.status}.`; continue }
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) throw new Error('This link does not point to a readable webpage.')
      const html = (await response.text()).slice(0, 1_200_000)
      const finalUrl = await safeUrl(response.url)
      const page = extractPage(html, finalUrl)
      const error = pageProblem(page, finalUrl, html)
      if (error) { lastProblem = error; continue }
      return { page, finalUrl }
    } catch (error) {
      lastProblem = error instanceof Error && error.name === 'TimeoutError' ? 'The website took too long to respond.' : error instanceof Error ? error.message : lastProblem
    }
  }
  throw new Error(lastProblem)
}

function pageProblem(page: ExtractedPage, url: URL, html: string): string | null {
  // YouTube ships localised "not found" strings inside the chrome of every
  // successful video page. Its structured player state is the only signal an
  // automated reader can trust instead of the title/description heuristics.
  if (isYouTube(url)) {
    if (/"playabilityStatus"\s*:\s*\{\s*"status"\s*:\s*"OK"/.test(html) && /"videoDetails"\s*:\s*\{[^}]*"videoId"\s*:\s*"[^"]+"/.test(html)) return null
    if (/"playabilityStatus"\s*:\s*\{\s*"status"\s*:\s*"(?:ERROR|UNPLAYABLE)"/.test(html)) return 'YouTube reports that this video is unavailable.'
    return null
  }
  const titleSignals = `${page.title} ${page.heading}`.trim()
  if (ERROR_TITLE.test(titleSignals) || /requested webpage could not be found/i.test(page.description)) {
    // Twinkl and other providers inject generic "content not found" / "request
    // unsuccessful" boilerplate into otherwise valid pages. Only an explicit
    // 404 page is real evidence the resource itself is gone.
    if (isTwinkl(url)) {
      const explicit404 = /\b404\s+page\s+not\s+found\b/i.test(page.text) || (/\bsorry[,! ]+we\s+couldn't\s+find\b/i.test(page.text) && /\b(?:homepage|search)\b/i.test(page.text))
      return explicit404 ? 'Twinkl reports that this activity page was not found.' : null
    }
    return 'The website returned a “Page Not Found” page.'
  }
  if (!page.title || page.title.length < 3) return 'The webpage did not provide a usable title.'
  if (page.text.length < 100 && !page.description) return 'Not enough public page information was available to analyse.'
  return null
}

function extractPage(html: string, finalUrl: URL): ExtractedPage {
  const structured = extractStructuredData(html)
  const metas = extractMetaTags(html)
  const htmlTitle = decode(match(html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const heading = decode(match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  const title = firstUseful(structured.name, metas['og:title'], metas['twitter:title'], heading, htmlTitle)
  const description = firstUseful(structured.description, metas['og:description'], metas.description, metas['twitter:description'])
  const canonical = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i) || finalUrl.toString()
  const bodyText = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  return { title: cleanTitle(title), description: description.slice(0, 900), heading, text: prioritiseText(bodyText, heading || title), canonicalUrl: canonical }
}

function extractStructuredData(html: string): { name: string; description: string } {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const script of scripts) {
    try {
      const root = JSON.parse(script[1]) as unknown
      for (const value of flattenObjects(root)) {
        const type = Array.isArray(value['@type']) ? value['@type'].join(' ') : String(value['@type'] ?? '')
        if (!/Product|CreativeWork|LearningResource|Article|WebPage/i.test(type)) continue
        const name = typeof value.name === 'string' ? value.name.trim() : ''
        const description = typeof value.description === 'string' ? stripTags(value.description) : ''
        if (name) return { name, description }
      }
    } catch { /* malformed JSON-LD is ignored */ }
  }
  return { name: '', description: '' }
}

function flattenObjects(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(flattenObjects)
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  return [record, ...Object.values(record).flatMap(flattenObjects)]
}

function extractMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {}
    for (const attr of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[attr[1].toLowerCase()] = decode(attr[3])
    const key = (attrs.property || attrs.name || '').toLowerCase()
    if (key && attrs.content) result[key] = attrs.content
  }
  return result
}

/**
 * Sitewide navigation, footers and cookie banners drown out the actual
 * activity text once a page grows past a few thousand words. Centring the
 * extract on the page's own heading — the same anchor readers use — keeps
 * the AI's 12,000-character budget spent on the article body instead of
 * chrome, while a slice of the very start of the page is retained for
 * intro copy that appears before the heading.
 */
function prioritiseText(text: string, anchor: string): string {
  const cleanAnchor = anchor.trim().toLowerCase()
  if (!cleanAnchor) return text.slice(0, 12_000)
  const index = text.toLowerCase().indexOf(cleanAnchor)
  if (index < 0) return text.slice(0, 12_000)
  const focused = text.slice(Math.max(0, index - 800), index + 9_500)
  return `${focused}\n${text.slice(0, 2_500)}`.slice(0, 12_000)
}

function responseShapeInstructions(kind: 'ideas' | 'outings'): string {
  const activityRule = kind === 'ideas'
    ? `activityType must be exactly one of ${ACTIVITY_TYPES.join(', ')}, or an empty string if unsupported. Yoga, movement and gross-motor activities are Outdoor & Physical Play; video and audio resources are Music / Video. topic must be an empty string.`
    : `topic must be exactly one of ${EXPERIENCE_TAGS.join(', ')} — choose what children actually experience or practise, not the venue format. activityType must be an empty string.`
  const audienceRule = kind === 'outings'
    ? 'audience must be educator, parents, or both. Choose both by default for a provider-delivered incursion or excursion, since these are usually useful to ECEC services AND families; choose educator only when the page explicitly restricts the offer to ECEC professionals or service bookings, and parents only when it is explicitly family-only.'
    : 'audience must be educator, parents, or both, based only on who the page says the activity suits; default to both when both individual and group use are supported.'

  return `PROVIDER FIELDS: providerName is the organisation named on the page, not the raw domain. providerType is a concise trust label such as "Official government provider", "Official park authority", "Museum or cultural institution", "Registered non-profit", "Commercial provider", or "Educator / blog". Leave either as an empty string only if the page truly gives no clue.\n\nCLASSIFICATION: ${activityRule} ${audienceRule} stateTerritory must be one of VIC, NSW, QLD, WA, SA, TAS, ACT, NT, National, or Unknown — National unless the page explicitly limits itself to one Australian state or territory. venueSetting must be indoor, outdoor, mixed, or not_applicable (not_applicable for a screen-based, printable, or purely at-home resource). age must be All Ages, 1–3 yrs, or 3–5 yrs; choose All Ages when the source spans both early-years groups.\n\nEXPERIENCE & PRACTICAL DETAIL: experienceTags is an array of 1 to 3 items from ${EXPERIENCE_TAGS.join(', ')} describing what children experience or practise (return an empty array for a learning idea). potentialBenefits is an array of 1 to 3 concise, evidence-based child outcomes in plain language, or an empty array if the page gives none. practicalFeatures is an array of 1 to 3 explicit planning facts actually stated on the page, such as booking requirements, cost, accessibility, delivery area, indoor/outdoor format, duration, or educator resources — never invent one. materials is an array of any physical items or supplies the page names as needed for the activity. stepsSummary is a short plain-language summary of how to run the activity or what to expect, using only page evidence; use an empty string if the page does not describe a process. learningArea is a short label for the underlying learning domain, such as "Language & Literacy" or "Social & Emotional Learning".\n\nEYLF RULE: eylfOutcome is Outcome 1 through Outcome 5, or null, and must only be set when the page text supports a genuine connection — never guess one for the sake of filling the field. eylfDetail must contain a specific source-supported sub-outcome clause such as 2.1 if and only if that exact code appears in the page text; otherwise an empty string. eylfEvidence is a short paraphrase of the page evidence that supports the chosen eylfOutcome, or an empty string when eylfOutcome is null.\n\nSUMMARY QUALITY: write a concise one- or two-sentence description stating what this resource/activity is and the most useful practical detail explicitly found on the page (a named guide, booking step, cost, or safety/accessibility note) — no vague filler. reviewReason is one sentence explaining which page evidence supports the chosen fields.\n\nReturn JSON only, in exactly this shape: {"title":"string","description":"string","providerName":"string","providerType":"string","activityType":"string","topic":"string","stateTerritory":"string","venueSetting":"indoor|outdoor|mixed|not_applicable","audience":"educator|parents|both","age":"All Ages|1–3 yrs|3–5 yrs","experienceTags":["string"],"potentialBenefits":["string"],"practicalFeatures":["string"],"materials":["string"],"stepsSummary":"string","learningArea":"string","eylfOutcome":"Outcome 1|Outcome 2|Outcome 3|Outcome 4|Outcome 5|null","eylfDetail":"string","eylfEvidence":"string","location":"string","confidenceScore":0,"reviewReason":"string"}.`
}

function buildPrompt(url: URL, page: ExtractedPage, kind: 'ideas' | 'outings'): string {
  return `Audit this exact Australian early-childhood ${kind === 'outings' ? 'outing or venue' : 'learning activity'} page. Use only the supplied source evidence — never prior knowledge. Do not invent an EYLF clause, provider detail, age, location, activity type, or practical detail; if a field is unsupported, use an empty string or empty array as instructed below.\n\nURL: ${url.toString()}\nCANONICAL: ${page.canonicalUrl}\nTITLE: ${page.title}\nH1: ${page.heading}\nDESCRIPTION: ${page.description}\nPAGE TEXT:\n${page.text}\n\n${responseShapeInstructions(kind)}`
}

function manualReviewFallback(url: URL, cause: unknown): AnalysisResult {
  const slug = decodeURIComponent(url.pathname).split('/').filter(Boolean).at(-1)?.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Web resource'
  const reason = cause instanceof Error ? cause.message : 'Automated access was unavailable.'
  const providerName = url.hostname.replace(/^www\./, '')
  return {
    ...blankResult(slug),
    providerName,
    providerType: 'Source provider',
    description: 'This link has been accepted for review. Please confirm the activity details from the original page before publishing it.',
    confidenceScore: 35,
    reviewReason: `${reason} This link is not rejected during intake; please verify the details manually.`,
  }
}

function blankResult(title: string): AnalysisResult {
  return {
    title,
    description: '',
    activityType: '',
    topic: '',
    age: 'All Ages',
    eylfOutcome: null,
    eylfDetail: '',
    eylfEvidence: '',
    location: '',
    providerName: '',
    providerType: '',
    stateTerritory: '',
    venueSetting: 'not_applicable',
    audience: 'both',
    experienceTags: [],
    potentialBenefits: [],
    practicalFeatures: [],
    materials: [],
    stepsSummary: '',
    learningArea: '',
    analysisMode: 'metadata',
    confidenceScore: 35,
    reviewReason: 'Only the URL was available.',
  }
}

function inferFromEvidence(page: ExtractedPage, kind: 'ideas' | 'outings'): AnalysisResult {
  const evidence = `${page.title} ${page.description} ${page.heading} ${page.text.slice(0, 5000)}`.toLowerCase()
  const activityType = kind === 'ideas' ? inferActivityType(evidence) : ''
  const topic = kind === 'outings' ? inferExperienceTag(evidence) : ''
  const age: AnalysisResult['age'] = /(?:0|1)\s*[-–]\s*3|bab(?:y|ies)|toddler/.test(evidence) && /3\s*[-–]\s*5|preschool|kinder/.test(evidence) ? 'All Ages' : /(?:0|1)\s*[-–]\s*3|bab(?:y|ies)|toddler/.test(evidence) ? '1–3 yrs' : /3\s*[-–]\s*5|preschool|kinder|pre-k/.test(evidence) ? '3–5 yrs' : 'All Ages'
  const explicitOutcome = evidence.match(/\b(?:eylf\s*)?outcome\s*([1-5])\b/i)?.[1]
  const stateMatch = evidence.match(/\b(victoria|new south wales|queensland|western australia|south australia|tasmania|\bvic\b|\bnsw\b|\bqld\b|\bwa\b|\bsa\b|\btas\b|\bact\b|\bnt\b)\b/i)?.[1]
  return {
    title: page.heading || page.title,
    description: page.description || evidenceSummary(page.text),
    activityType,
    topic,
    age,
    eylfOutcome: explicitOutcome ? `Outcome ${explicitOutcome}` as AnalysisResult['eylfOutcome'] : null,
    eylfDetail: '',
    eylfEvidence: '',
    location: '',
    providerName: new URL(page.canonicalUrl).hostname.replace(/^www\./, ''),
    providerType: '',
    stateTerritory: stateMatch ? normaliseStateTerritory(stateMatch) : 'National',
    venueSetting: 'not_applicable',
    audience: 'both',
    experienceTags: kind === 'outings' && topic ? [topic] : [],
    potentialBenefits: [],
    practicalFeatures: [],
    materials: [],
    stepsSummary: '',
    learningArea: '',
    analysisMode: 'metadata',
    confidenceScore: page.description ? 65 : 50,
    reviewReason: 'Verified page metadata was extracted; AI enrichment was unavailable.',
  }
}

function normaliseStateTerritory(value: string): string {
  const lookup: Record<string, string> = {
    victoria: 'VIC', 'new south wales': 'NSW', queensland: 'QLD', 'western australia': 'WA', 'south australia': 'SA', tasmania: 'TAS',
  }
  return lookup[value.toLowerCase()] ?? value.toUpperCase()
}

function validateAiResult(value: Record<string, unknown>, fallback: AnalysisResult, page?: ExtractedPage): AnalysisResult {
  const string = (key: string): string => typeof value[key] === 'string' ? String(value[key]).trim() : ''
  const stringArray = (key: string): string[] => Array.isArray(value[key]) ? [...new Set((value[key] as unknown[]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, 5) : []
  const title = string('title')
  const description = string('description')
  const type = string('activityType')
  const outcome = string('eylfOutcome')
  const age = string('age')
  const venueSetting = string('venueSetting')
  const audience = string('audience')
  const topic = string('topic')
  const confidence = Number(value.confidenceScore)
  const eylfOutcome = EYLF_OUTCOMES.includes(outcome as (typeof EYLF_OUTCOMES)[number]) ? outcome as AnalysisResult['eylfOutcome'] : fallback.eylfOutcome
  const eylfDetail = /^\d\.\d$/.test(string('eylfDetail')) && (!page || page.text.includes(string('eylfDetail'))) ? string('eylfDetail') : ''
  return {
    title: title && !ERROR_TITLE.test(title) ? title : fallback.title,
    description: description || fallback.description,
    activityType: ACTIVITY_TYPES.includes(type as (typeof ACTIVITY_TYPES)[number]) ? type : fallback.activityType,
    topic: topic || fallback.topic,
    age: ['All Ages', '1–3 yrs', '3–5 yrs'].includes(age) ? age as AnalysisResult['age'] : fallback.age,
    eylfOutcome,
    eylfDetail,
    eylfEvidence: eylfOutcome ? (string('eylfEvidence') || fallback.eylfEvidence) : '',
    location: string('location') || fallback.location,
    providerName: string('providerName') || fallback.providerName,
    providerType: string('providerType') || fallback.providerType,
    stateTerritory: string('stateTerritory') || fallback.stateTerritory,
    venueSetting: VENUE_SETTINGS.includes(venueSetting as (typeof VENUE_SETTINGS)[number]) ? venueSetting as AnalysisResult['venueSetting'] : fallback.venueSetting,
    audience: AUDIENCES.includes(audience as (typeof AUDIENCES)[number]) ? audience as AnalysisResult['audience'] : fallback.audience,
    experienceTags: stringArray('experienceTags').filter((tag) => EXPERIENCE_TAGS.includes(tag as (typeof EXPERIENCE_TAGS)[number])).slice(0, 3),
    potentialBenefits: stringArray('potentialBenefits').slice(0, 3),
    practicalFeatures: stringArray('practicalFeatures').slice(0, 3),
    materials: stringArray('materials'),
    stepsSummary: string('stepsSummary') || fallback.stepsSummary,
    learningArea: string('learningArea') || fallback.learningArea,
    analysisMode: 'ai',
    confidenceScore: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 75,
    reviewReason: string('reviewReason') || 'The title, description and page content support these suggested fields.',
  }
}

function inferActivityType(text: string): string {
  if (/story|book|phonics|literacy|letter|writing|language/.test(text)) return 'Stories & Letters'
  if (/sensory|messy|playdough|water play|fine motor/.test(text)) return 'Sensory & Messy Play'
  if (/music|song|dance|video|rhyme|audio/.test(text)) return 'Music / Video'
  if (/science|stem|experiment|engineering|math|count|number|investigat/.test(text)) return 'STEM & Nature'
  if (/outdoor|physical|sport|movement|garden|nature|gross motor/.test(text)) return 'Outdoor & Physical Play'
  if (/art|craft|paint|draw|collage|colour|cut.?out/.test(text)) return 'Arts & Crafts'
  return ''
}

function inferExperienceTag(text: string): string {
  if (/animal|wildlife|zoo|farm|reptile|aquarium/.test(text)) return 'Animal Encounters'
  if (/first nations|aboriginal|indigenous|country/.test(text)) return 'First Nations Perspectives'
  if (/garden|park|nature|environment|sustainab|bush/.test(text)) return 'Nature & Sustainability'
  if (/science|stem|museum|experiment|dinosaur|fossil/.test(text)) return 'STEM & Discovery'
  if (/language|literacy|story|read|writ/.test(text)) return 'Language & Literacy'
  if (/art|music|gallery|creative|dance|drama/.test(text)) return 'Arts, Music & Creativity'
  if (/movement|sport|physical|wellbeing|active/.test(text)) return 'Movement & Wellbeing'
  if (/sensory|hands-on|interactive|touch|make/.test(text)) return 'Sensory & Hands-on'
  if (/team|social|cooperat|group/.test(text)) return 'Social Skills & Teamwork'
  if (/community|safety|fire|library|life skill/.test(text)) return 'Community & Life Skills'
  return ''
}

async function safeUrl(raw: string): Promise<URL> {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('Enter a complete website link, including https://.') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https links can be analysed.')
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.local')) throw new Error('Local network links cannot be analysed.')
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true })
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('Private network links cannot be analysed.')
  return url
}

function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase()
  return value === '::1' || value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd') || /^127\./.test(value) || /^10\./.test(value) || /^192\.168\./.test(value) || /^169\.254\./.test(value) || /^172\.(1[6-9]|2\d|3[01])\./.test(value) || value === '0.0.0.0'
}

function isTwinkl(url: URL): boolean { const host = url.hostname.replace(/^www\./, '').toLowerCase(); return host === 'twinkl.com' || host.endsWith('.twinkl.com') || host === 'twinkl.com.au' || host.endsWith('.twinkl.com.au') }
function isYouTube(url: URL): boolean { const host = url.hostname.replace(/^www\./, '').toLowerCase(); return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' }
function isRaisingChildren(url: URL): boolean { const host = url.hostname.replace(/^www\./, '').toLowerCase(); return host === 'raisingchildren.net.au' || host.endsWith('.raisingchildren.net.au') }
function match(value: string, pattern: RegExp): string { return value.match(pattern)?.[1]?.trim() ?? '' }
function decode(value: string): string { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() }
function stripTags(value: string): string { return decode(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }
function firstUseful(...values: Array<string | undefined>): string { return values.find((value) => value && value.trim() && !ERROR_TITLE.test(value.trim()))?.trim() ?? values.find((value) => value?.trim())?.trim() ?? '' }
function cleanTitle(value: string): string { return decode(value).replace(/\s+/g, ' ').split(/\s+[|–—]\s+/)[0]?.trim() || '' }
function evidenceSummary(value: string): string { const sentence = value.match(/[^.!?]{30,220}[.!?]/)?.[0]?.trim(); return sentence || 'Review the original page for full activity details.' }
function extractJsonObject(value: string): string { const start = value.indexOf('{'); const end = value.lastIndexOf('}'); if (start < 0 || end <= start) throw new Error('AI returned an invalid structured response.'); return value.slice(start, end + 1) }
