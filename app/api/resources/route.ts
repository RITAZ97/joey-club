import { and, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { resources, sources } from '@/lib/db/schema'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
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
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 12
  const conditions: SQL[] = [inArray(resources.status, ['source_linked', 'approved'])]

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

  return Response.json({ data })
}
