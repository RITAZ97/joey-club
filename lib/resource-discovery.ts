export type CanonicalAgeStage = 'All ages' | '1 - 3 yrs (Toddlers)' | '3 - 5 yrs (Kinders & Preschoolers)'

export interface DiscoveryDocument {
  title: string
  description?: string
  activityType?: string
  topic?: string
  eylfOutcome?: string
  learningArea?: string
  format?: string
  tags?: readonly string[]
}

const conceptGroups: readonly (readonly string[])[] = [
  ['sensory', 'messy', 'tactile', 'playdough', 'slime', 'water', 'texture', 'hands-on'],
  ['stem', 'science', 'experiment', 'engineering', 'technology', 'maths', 'mathematics', 'discovery', 'investigation'],
  ['story', 'stories', 'book', 'reading', 'literacy', 'letters', 'alphabet', 'phonics', 'language', 'writing'],
  ['art', 'arts', 'craft', 'crafts', 'creative', 'painting', 'drawing', 'collage', 'making'],
  ['music', 'song', 'songs', 'rhythm', 'dance', 'video', 'singing'],
  ['outdoor', 'nature', 'physical', 'movement', 'sport', 'gross motor', 'garden', 'bush'],
  ['animal', 'animals', 'wildlife', 'zoo', 'farm', 'reptile'],
  ['wellbeing', 'emotion', 'emotions', 'social', 'friendship', 'mindfulness', 'self-regulation'],
  ['first nations', 'aboriginal', 'indigenous', 'torres strait', 'country', 'culture'],
  ['identity', 'belonging', 'community', 'communication', 'learning'],
]

const ignoredWords = new Set(['a', 'an', 'and', 'for', 'of', 'the', 'to', 'with', 'activity', 'activities', 'ideas', 'resource', 'resources'])

export function canonicalAgeStage(value: string | null | undefined): CanonicalAgeStage {
  const text = normalise(value ?? '')
  if (/\b(all|any) ages?\b|\b[01]\s*[-–]\s*5\b|birth\s*[-–]\s*5/.test(text)) return 'All ages'
  if (/\b[01]\s*[-–]\s*3\b|bab(y|ies)|toddler/.test(text)) return '1 - 3 yrs (Toddlers)'
  return '3 - 5 yrs (Kinders & Preschoolers)'
}

export function ageShortLabel(value: string | null | undefined): 'All ages' | '1–3 yrs' | '3–5 yrs' {
  const age = canonicalAgeStage(value)
  if (age === 'All ages') return age
  return age.startsWith('1') ? '1–3 yrs' : '3–5 yrs'
}

export function discoverySearchScore(document: DiscoveryDocument, rawQuery: string): number {
  const query = normalise(rawQuery)
  if (query.length === 0) return 1

  const fields: Array<{ text: string; weight: number }> = [
    { text: normalise(document.title), weight: 8 },
    { text: normalise(document.activityType ?? ''), weight: 7 },
    { text: normalise(document.topic ?? ''), weight: 6 },
    { text: normalise(document.learningArea ?? ''), weight: 5 },
    { text: normalise(document.eylfOutcome ?? ''), weight: 4 },
    { text: normalise(document.format ?? ''), weight: 3 },
    { text: normalise((document.tags ?? []).join(' ')), weight: 5 },
    { text: normalise(document.description ?? ''), weight: 2 },
  ]
  const combined = fields.map((field) => field.text).join(' ')
  const tokens = query.split(' ').filter((token) => token.length > 1 && !ignoredWords.has(token))
  if (tokens.length === 0) return combined.includes(query) ? 1 : 0

  let score = combined.includes(query) ? 18 : 0
  for (const token of tokens) {
    const concepts = conceptGroups.find((group) => group.some((term) => normalise(term).split(' ').includes(token))) ?? [token]
    const matchedTerms = concepts.filter((term) => fieldContains(fields, normalise(term)))
    if (matchedTerms.length === 0 && !hasFuzzyToken(combined, token)) return 0
    for (const field of fields) {
      if (matchedTerms.some((term) => field.text.includes(normalise(term))) || hasFuzzyToken(field.text, token)) score += field.weight
    }
  }
  return score
}

function fieldContains(fields: Array<{ text: string }>, term: string): boolean {
  return fields.some((field) => field.text.includes(term))
}

function hasFuzzyToken(text: string, token: string): boolean {
  if (text.includes(token)) return true
  if (token.length < 5) return false
  return text.split(' ').some((word) => Math.abs(word.length - token.length) <= 1 && levenshteinAtMostOne(word, token))
}

function levenshteinAtMostOne(left: string, right: string): boolean {
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false
  let edits = 0
  let leftIndex = 0
  let rightIndex = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else {
      leftIndex += 1
      rightIndex += 1
    }
  }
  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1
}

function normalise(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}
