export interface DiscoveryTopicQuery {
  topic: string
  keywords: readonly string[]
}

/**
 * Short, source-neutral terms passed to the whitelist-only discovery prompt.
 * Each array deliberately contains concise core terms rather than a long query
 * that would reduce the chance of finding a precise activity deep link.
 */
export const DISCOVERY_TOPIC_QUERIES: readonly DiscoveryTopicQuery[] = [
  { topic: 'Christmas', keywords: ['Christmas'] },
  { topic: 'Lunar New Year', keywords: ['Lunar New Year'] },
  { topic: 'Halloween', keywords: ['Halloween'] },
  { topic: 'Easter', keywords: ['Easter'] },
  { topic: 'Diwali', keywords: ['Diwali'] },
  { topic: 'First Nations Culture', keywords: ['Aboriginal', 'Torres Strait Islander', 'First Nations Australians', 'Indigenous early childhood education', 'NAIDOC', 'Reconciliation Week'] },
  { topic: 'Cultures & Festivals', keywords: ['Multicultural early learning', 'Mandarin', 'Hindi', 'Spanish', 'cultural inclusion ECEC', 'diversity in early years'] },
  { topic: 'Sustainability & Nature', keywords: ['Sustainability', 'nature play', 'environment', 'recycling', 'waste sorting bin', 'composting', 'gardening 0-5'] },
]

export function buildDiscoveryQuery(topic: DiscoveryTopicQuery): string {
  return `${topic.keywords.join(' OR ')} early childhood activity with materials and steps for ages 0-5`
}

