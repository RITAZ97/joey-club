import { and, desc, eq, ilike, inArray, notInArray, or, type SQL } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { resources, sources } from '@/lib/db/schema'

// Approved JoeySearch entries must be visible as soon as the public site next
// loads. Keep this shared catalogue endpoint dynamic rather than serving a
// cached snapshot from a prior deployment.
export const dynamic = 'force-dynamic'
export const revalidate = 0

function coreTopic(topic: string, activityType: string): string {
  const value = `${topic} ${activityType}`.toLowerCase()
  if (/first nations|aboriginal|culture|festival/.test(value)) return 'First Nations & Culture'
  if (/social.emotional|wellbeing|mindful|emotion|regulation/.test(value)) return 'SEL & Wellbeing'
  if (/art|craft|drama|creative|paint/.test(value)) return 'Arts & Expressive'
  if (/literacy|music|song|movement|phonic|language/.test(value)) return 'Literacy & Music'
  return 'STEM & Nature'
}

function accessType(format: string, url: string): string {
  const value = `${format} ${url}`.toLowerCase()
  if (/pdf|print|worksheet|template|poster|powerpoint/.test(value)) return 'Printable / PDF'
  if (/video|audio|youtube|abc kids|podcast/.test(value)) return 'Video / Audio'
  if (/game|interactive|playcentre/.test(value)) return 'Interactive Game'
  return 'Web Article / Guide'
}

function stringList(metadata: Record<string, unknown> | null, key: string): string[] {
  const value = metadata?.[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3) : []
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const keyword = searchParams.get('q')?.trim()
  const valuesFor = (key: string): string[] => searchParams.getAll(key).map((value) => value.trim()).filter(Boolean)
  const learningAreas = valuesFor('learningArea')
  const formats = valuesFor('format')
  const ageStages = valuesFor('ageStage')
  const settings = valuesFor('setting')
  const activityTypes = valuesFor('activityType')
  const topics = valuesFor('topic')
  const eylfOutcomes = valuesFor('eylfOutcome')
  const requestedLimit = Number(searchParams.get('limit') ?? '12')
  // The Explorer loads its complete curated inventory client-side so a title
  // search can find every Source-linked card, not only the newest first 50.
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 250) : 12
  const conditions: SQL[] = [inArray(resources.status, ['source_linked', 'approved'])]
  const outingActivityTypes = ['Incursion', 'Excursion', 'Indoor venue', 'Outdoor venue', 'Holiday program']

  // JoeySearch stores both catalogue types in the shared resources table.
  // Keep the public views separate by applying the category boundary here,
  // rather than allowing every database resource into both pages.
  if (category === 'outing') conditions.push(inArray(resources.activityType, outingActivityTypes))
  if (category === 'learning_idea') conditions.push(notInArray(resources.activityType, outingActivityTypes))

  if (keyword) {
    const term = `%${keyword}%`
    conditions.push(
      or(
        ilike(resources.title, term),
        ilike(resources.description, term),
        ilike(resources.activityType, term),
        ilike(resources.topic, term),
      ) as SQL,
    )
  }

  if (learningAreas.length > 0) conditions.push(or(...learningAreas.map((value) => eq(resources.learningArea, value))) as SQL)
  if (formats.length > 0) conditions.push(or(...formats.map((value) => eq(resources.format, value))) as SQL)
  if (ageStages.length > 0) conditions.push(or(...ageStages.map((value) => eq(resources.ageStage, value))) as SQL)
  if (settings.length > 0) conditions.push(or(...settings.map((value) => eq(resources.setting, value))) as SQL)
  if (activityTypes.length > 0) conditions.push(or(...activityTypes.map((value) => eq(resources.activityType, value))) as SQL)
  if (topics.length > 0) conditions.push(or(...topics.map((value) => eq(resources.topic, value))) as SQL)
  if (eylfOutcomes.length > 0) conditions.push(or(...eylfOutcomes.map((value) => eq(resources.eylfOutcome, value))) as SQL)

  const db = getDb()
  const data = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      canonicalUrl: resources.canonicalUrl,
      thumbnailUrl: resources.thumbnailUrl,
      ageStage: resources.ageStage,
      setting: resources.setting,
      activityType: resources.activityType,
      topic: resources.topic,
      eylfOutcome: resources.eylfOutcome,
      learningArea: resources.learningArea,
      format: resources.format,
      metadata: resources.metadata,
      status: resources.status,
      verifiedAt: resources.verifiedAt,
      createdAt: resources.createdAt,
      sourceName: sources.name,
      sourceSlug: sources.slug,
      sourceDomains: sources.allowedDomains,
    })
    .from(resources)
    .innerJoin(sources, eq(resources.sourceId, sources.id))
    .where(and(...conditions))
    .orderBy(desc(resources.createdAt))
    .limit(limit)

  return Response.json(
    { data: data.map((resource) => ({
      ...resource,
      coreTopic: coreTopic(resource.topic, resource.activityType),
      accessType: accessType(resource.format, resource.canonicalUrl),
      experienceTags: stringList(resource.metadata, 'experienceTags'),
      potentialBenefits: stringList(resource.metadata, 'potentialBenefits'),
      practicalFeatures: stringList(resource.metadata, 'practicalFeatures'),
      suggestedEylfConnection: resource.eylfOutcome,
      eylfEvidence: typeof resource.metadata?.eylfEvidence === 'string' ? resource.metadata.eylfEvidence : null,
    })) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
