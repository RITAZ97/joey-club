'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Search, ShieldCheck } from 'lucide-react'
import { FilterDropdown } from '@/components/filter-dropdown'
import { ResourceAgeMeta } from '@/components/resource-age-meta'
import { useResourceSearch } from '@/components/resource-search-context'
import { type ActivityCard, useSavedItems } from '@/components/saved-items'
import { canonicalAgeStage, discoverySearchScore } from '@/lib/resource-discovery'
import { RESOURCE_SOURCE_WHITELIST, SEARCH_RESOURCES, type ResourceFormat, type SearchResource } from '@/lib/resource-search'

type SearchFilterKey = 'ageStage' | 'activityType' | 'topic' | 'eylfOutcome'

// This is a venue/outings resource and is surfaced in Community & Learning
// Adventures instead of the Early Years Learning Explorer.
const EXPLORER_EXCLUDED_RESOURCE_TITLES = new Set(['early learning outdoors'])

interface CategorySection {
  key: SearchFilterKey
  title: string
  options: string[]
}

const categorySections: CategorySection[] = [
  { key: 'ageStage', title: 'Age & Stage', options: ['1 - 3 yrs (Toddlers)', '3 - 5 yrs (Kinders & Preschoolers)', 'All ages'] },
  { key: 'activityType', title: 'Activity Type', options: ['Arts & Crafts', 'STEM', 'Music / Video', 'Literacy & Storytelling', 'Sensory & Messy Play', 'Outdoor & Physical Play'] },
  { key: 'topic', title: 'Core Topics', options: ['First Nations', 'Festivals & Culture', 'SEL & Wellbeing', 'Child Safety'] },
  { key: 'eylfOutcome', title: 'EYLF 2.0 Outcomes', options: ['Outcome 1: Children have a strong sense of identity', 'Outcome 2: Children are connected with and contribute to their world', 'Outcome 3: Children have a strong sense of wellbeing', 'Outcome 4: Children are confident and involved learners', 'Outcome 5: Children are effective communicators'] },
]

const emptyFilters: Record<SearchFilterKey, string[]> = { ageStage: [], activityType: [], topic: [], eylfOutcome: [] }
const learningAreaOptions = ['Learning area', 'Social & Emotional Learning', 'Language & Communication', 'Cognition & Problem Solving', 'Gross & Fine Motor Skills', 'Creative Expressive Arts']
const pageSize = 12

const sourceSlugToId: Record<string, SearchResource['source']> = {
  'twinkl-australia': 'twinkl',
  'teachers-pay-teachers': 'teachersPayTeachers',
  'teach-starter': 'teachStarter',
  stemeez: 'stemeez',
  'abc-kids-early-education': 'abcKids',
  'youtube-kids': 'youtubeKids',
  'raising-children-network': 'raisingChildren',
  'early-childhood-australia': 'earlyChildhoodAustralia',
  'playgroup-nsw': 'playgroupNsw',
  cbeebies: 'cbeebies',
}

const cardImageByActivityType: Record<string, string> = {
  'Arts & Crafts': '/cards/activity-arts-crafts.png',
  STEM: '/cards/activity-stem-nature.png',
  'Music / Video': '/cards/activity-music-video.png',
  'Literacy & Storytelling': '/cards/activity-stories-letters.png',
  'Sensory & Messy Play': '/cards/activity-sensory-messy.png',
  'Outdoor & Physical Play': '/cards/activity-outdoor-physical.png',
}

function displayActivityType(activityType: string): string {
  if (activityType === 'Literacy & Storytelling') return 'Stories & Letters'
  if (activityType === 'STEM') return 'STEM & Nature'
  return activityType
}

function cardImageForResource(activityType: string, fallbackImage: string): string {
  return cardImageByActivityType[activityType] ?? fallbackImage
}

const searchResourceAgeStages = ['1 - 3 yrs (Toddlers)', '3 - 5 yrs (Kinders & Preschoolers)', 'All ages'] as const
const searchResourceSettings = ['Individual (1-on-1)', 'Group', 'Flexible'] as const
const searchResourceActivityTypes = ['Arts & Crafts', 'STEM', 'Music / Video', 'Literacy & Storytelling', 'Sensory & Messy Play', 'Outdoor & Physical Play'] as const
const searchResourceTopics = ['First Nations Culture', 'Cultures & Festivals', 'Sustainability & Nature', 'Social-Emotional Wellbeing'] as const
const searchResourceEylfOutcomes = ['Outcome 1: Children have a strong sense of identity', 'Outcome 2: Children are connected with and contribute to their world', 'Outcome 3: Children have a strong sense of wellbeing', 'Outcome 4: Children are confident and involved learners', 'Outcome 5: Children are effective communicators'] as const
const searchResourceLearningAreas = ['Social & Emotional Learning', 'Language & Communication', 'Cognition & Problem Solving', 'Gross & Fine Motor Skills', 'Creative Expressive Arts'] as const
const defaultResourceFormat: ResourceFormat = 'Lesson Plan / Activity Guide'

interface SourceLinkedApiResource {
  id: string
  title: string
  description: string
  canonicalUrl: string
  ageStage: string
  setting: string
  activityType: string
  topic: string
  eylfOutcome: string | null
  learningArea: string
  format: string
  sourceSlug: string
}

interface SourceLinkedApiResponse {
  data: SourceLinkedApiResource[]
}

function asAllowedValue<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

/** The six child-facing card types are deliberately compact and controlled. */
function normaliseLearningActivityType(value: string): typeof searchResourceActivityTypes[number] {
  const text = value.toLowerCase()
  if (text.trim() === 'none') return 'None' as typeof searchResourceActivityTypes[number]
  if (/(yoga|physical|gross motor|sport|active play|movement game|exercise|outdoor play)/.test(text)) return 'Outdoor & Physical Play'
  if (/(video|audio|youtube|podcast)/.test(text)) return 'Music / Video'
  if (/(science|stem|experiment|engineering|math|build|discovery)/.test(text)) return 'STEM'
  if (/(art|craft|paint|drawing|printing|collage|making)/.test(text)) return 'Arts & Crafts'
  if (/(story|book|read|language|phonics|literacy)/.test(text)) return 'Literacy & Storytelling'
  if (/(sensory|playdough|messy|water play|fine motor)/.test(text)) return 'Sensory & Messy Play'
  if (/(song|dance|music|rhyme|movement)/.test(text)) return 'Music / Video'
  return 'Arts & Crafts'
}

function normaliseSettingForCard(setting: string): typeof searchResourceSettings[number] {
  const text = setting.toLowerCase()
  const individual = /(individual|one-to-one|1-on-1|home|family|parent|carer|caregiver)/.test(text)
  const group = /(group|class|educator-led|whole group|small group)/.test(text)
  if (individual && group) return 'Flexible'
  if (individual) return 'Individual (1-on-1)'
  if (text.includes('flexible') || text.includes('either')) return 'Flexible'
  return 'Group'
}

function coreTopicFor(resource: Pick<SearchResource, 'title' | 'description' | 'topic' | 'activityType'>): string {
  const value = `${resource.title} ${resource.description} ${resource.topic} ${resource.activityType}`.toLowerCase()
  if (/child safety|child-safe|e-?safety|online safety|digital safety|internet safety|safe browsing/.test(value)) return 'Child Safety'
  if (/first nations|aboriginal|torres strait/.test(value)) return 'First Nations'
  if (/culture|festival/.test(value)) return 'Festivals & Culture'
  if (/social.emotional|wellbeing|mindful|emotion|regulation/.test(value)) return 'SEL & Wellbeing'
  return 'None'
}

function inferLearningArea(resource: SourceLinkedApiResource, activityType: string): string {
  const searchableText = `${resource.title} ${resource.description} ${resource.topic}`.toLowerCase()
  const typeArea: Partial<Record<string, string>> = {
    'Arts & Crafts': 'Creative Expressive Arts',
    'STEM & Nature': 'Cognition & Problem Solving',
    'Music / Video': 'Gross & Fine Motor Skills',
    'Literacy & Storytelling': 'Language & Communication',
    'Sensory & Messy Play': 'Gross & Fine Motor Skills',
    'Outdoor & Physical Play': 'Gross & Fine Motor Skills',
  }

  // Imported records previously defaulted to Social & Emotional Learning when a
  // source did not expose a dedicated learning-area label. Prefer the activity
  // type in that situation so this filter describes what the child will do.
  if (resource.learningArea && resource.learningArea !== 'Social & Emotional Learning') return resource.learningArea
  if (/emotion|wellbeing|friendship|belonging|identity|kindness|self-regulation/.test(searchableText) && activityType === 'Literacy & Storytelling') {
    return 'Social & Emotional Learning'
  }
  return typeArea[activityType] ?? 'Social & Emotional Learning'
}

function asSearchResource(resource: SourceLinkedApiResource): SearchResource | null {
  const source = sourceSlugToId[resource.sourceSlug] ?? 'joeysearch'
  const setting = normaliseSettingForCard(resource.setting)
  const activityType = normaliseLearningActivityType(`${resource.activityType} ${resource.title} ${resource.description} ${resource.format}`)
  const ageStage = canonicalAgeStage(resource.ageStage)
  const rawEylfOutcome = resource.eylfOutcome
  const eylfOutcome = rawEylfOutcome === null ? undefined : searchResourceEylfOutcomes.find((outcome) => outcome.startsWith(rawEylfOutcome))

  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    ages: ageStage === 'All ages' ? 'All ages' : ageStage.startsWith('1') ? '1-3' : '3-5',
    ageStage,
    setting: asAllowedValue(setting, searchResourceSettings, 'Group'),
    activityType,
    topic: resource.topic || 'Social-Emotional Wellbeing',
    ...(eylfOutcome === undefined ? {} : { eylfOutcome }),
    learningArea: inferLearningArea(resource, activityType),
    format: resource.format || defaultResourceFormat,
    source,
    sourceUrl: resource.canonicalUrl,
    image: cardImageForResource(activityType, '/cards/activity-arts-crafts.png'),
    classificationBasis: 'source_content',
    classificationNote: 'Source-linked from a trusted JoeyClub whitelist domain.',
    verificationStatus: 'source_linked',
  }
}

function toSavedActivity(resource: SearchResource): ActivityCard {
  const environment = /outdoor|physical|nature/i.test(`${resource.activityType} ${resource.topic}`) ? 'Outdoor' : 'Indoor'
  const ageGroup = canonicalAgeStage(resource.ageStage).startsWith('1') ? 'Toddlers' : 'Pre-school'
  const match = resource.eylfOutcome?.match(/^Outcome\s+(\d)/)?.[1]
  const coreTopic = coreTopicFor(resource)
  const displayType = displayActivityType(resource.activityType)
  return { id: `resource-${resource.id}`, title: resource.title, description: resource.description, image: resource.image, sourceUrl: resource.sourceUrl, environment, ageGroup, eylfOutcomes: match ? [`Outcome ${match}` as ActivityCard['eylfOutcomes'][number]] : [], tags: coreTopic === 'None' ? [displayType] : [displayType, coreTopic], origin: 'joeyclub', sourceName: RESOURCE_SOURCE_WHITELIST[resource.source].name, activityType: displayType }
}

export function EarlyYearsExplorer(): ReactElement {
  const { activeSearch, applyHeroSearch } = useResourceSearch()
  const [selectedFilters, setSelectedFilters] = useState<Record<SearchFilterKey, string[]>>(emptyFilters)
  const [explorerQuery, setExplorerQuery] = useState<string>(activeSearch.query)
  const [learningArea, setLearningArea] = useState<string>(learningAreaOptions[0])
  const [page, setPage] = useState<number>(1)
  const { isActivitySaved, toggleSaveActivity } = useSavedItems()
  const [sourceLinkedResources, setSourceLinkedResources] = useState<SearchResource[]>([])

  useEffect(() => {
    let isCurrent = true
    void fetch('/api/resources?category=learning_idea&limit=250')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load Source-linked resources.')
        return response.json() as Promise<SourceLinkedApiResponse>
      })
      .then((response) => {
        if (!isCurrent) return
        setSourceLinkedResources(response.data.map(asSearchResource).filter((resource): resource is SearchResource => resource !== null && !EXPLORER_EXCLUDED_RESOURCE_TITLES.has(resource.title.trim().toLowerCase())))
      })
      .catch(() => {
        if (isCurrent) setSourceLinkedResources([])
      })
    return () => { isCurrent = false }
  }, [])

  const searchResources = useMemo<SearchResource[]>(() => {
    // Database-backed cards are the current curated inventory and must be
    // discoverable on the first result page. Static records only fill gaps in
    // the prototype while a matching source-linked card does not exist.
    const sourceLinkedUrls = new Set(sourceLinkedResources.map((resource) => resource.sourceUrl))
    return [...sourceLinkedResources, ...SEARCH_RESOURCES.filter((resource) => !sourceLinkedUrls.has(resource.sourceUrl) && !EXPLORER_EXCLUDED_RESOURCE_TITLES.has(resource.title.trim().toLowerCase()))].map((resource) => {
      const activityType = normaliseLearningActivityType(`${resource.activityType} ${resource.title} ${resource.description} ${resource.format}`)
      const ageStage = canonicalAgeStage(resource.ageStage || resource.ages)
      return { ...resource, ages: ageStage === 'All ages' ? 'All ages' : ageStage.startsWith('1') ? '1-3' : '3-5', ageStage, setting: normaliseSettingForCard(resource.setting), activityType, image: cardImageForResource(activityType, resource.image) }
    })
  }, [sourceLinkedResources])

  const filteredResources = useMemo<SearchResource[]>(() => searchResources.map((resource) => {
    const categoryMatches = categorySections.every((section) => {
      const selectedValues = selectedFilters[section.key]
      const resourceValue = section.key === 'topic' ? coreTopicFor(resource) : section.key === 'ageStage' ? canonicalAgeStage(resource.ageStage) : resource[section.key]
      return selectedValues.length === 0 || (typeof resourceValue === 'string' && selectedValues.includes(resourceValue))
    })
    const areaMatches = learningArea === learningAreaOptions[0] || resource.learningArea === learningArea
    const searchScore = discoverySearchScore(resource, explorerQuery)
    const heroAgeMatches = activeSearch.scope !== 'All resources' && activeSearch.scope !== 'Learning ideas'
      ? true
      : activeSearch.age === 'All ages' || canonicalAgeStage(resource.ageStage) === activeSearch.age || canonicalAgeStage(resource.ageStage) === 'All ages'
    return { resource, searchScore, matches: categoryMatches && areaMatches && searchScore > 0 && heroAgeMatches }
  }).filter((result) => result.matches).sort((left, right) => explorerQuery.trim().length > 0 ? right.searchScore - left.searchScore : 0).map((result) => result.resource), [activeSearch, explorerQuery, learningArea, searchResources, selectedFilters])

  useEffect(() => { setPage(1) }, [activeSearch])
  useEffect(() => { setExplorerQuery(activeSearch.scope === 'All resources' || activeSearch.scope === 'Learning ideas' ? activeSearch.query : '') }, [activeSearch.query, activeSearch.scope])

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const diversifiedResources = useMemo<SearchResource[]>(() => explorerQuery.trim().length > 0 ? filteredResources : diversifyBySource(filteredResources), [explorerQuery, filteredResources])
  const visibleResources = diversifiedResources.slice((safePage - 1) * pageSize, safePage * pageSize)
  const hasActiveFilters = categorySections.some((section) => selectedFilters[section.key].length > 0) || explorerQuery.trim().length > 0 || learningArea !== learningAreaOptions[0] || activeSearch.age !== 'All ages' || activeSearch.scope !== 'All resources'

  const toggleFilter = (key: SearchFilterKey, option: string): void => {
    setSelectedFilters((current) => ({ ...current, [key]: current[key].includes(option) ? current[key].filter((value) => value !== option) : [...current[key], option] }))
    setPage(1)
  }
  const clearAll = (): void => { setSelectedFilters(emptyFilters); setExplorerQuery(''); setLearningArea(learningAreaOptions[0]); applyHeroSearch({ query: '', age: 'All ages', scope: 'All resources' }); setPage(1) }

  return (
    <section id="early-years-explorer" className="mx-auto w-full scroll-mt-6 px-5 py-9 sm:py-12 lg:w-[95%] lg:max-w-[1400px] lg:px-10 lg:py-14">
      <div className="flex items-end justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="font-display text-[clamp(1.85rem,7vw,2.4rem)] font-bold tracking-tight text-brand-dark">Early Years Explorer</h2>
          <p className="mt-1 text-[0.86rem] text-muted-foreground sm:mt-1.5 sm:text-[1rem]">Discover safe, age-appropriate learning ideas.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:mt-7 sm:gap-6 lg:mt-8 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <FilterSidebar sections={categorySections} selectedFilters={selectedFilters} onToggle={toggleFilter} />
        <div className="min-w-0">
          <div className="grid grid-cols-1 items-center gap-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:gap-3">
            <label className="flex h-11 items-center gap-3 rounded-xl border border-border bg-card px-3.5 text-[0.84rem] text-foreground/80 focus-within:border-primary sm:h-[46px] sm:rounded-2xl sm:px-4 sm:text-[0.9rem]">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input value={explorerQuery} onChange={(event) => { setExplorerQuery(event.target.value); setPage(1) }} type="search" placeholder="Search by keyword" aria-label="Search resources by keyword" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
            </label>
            <FilterDropdown label="Learning area" options={learningAreaOptions} value={learningArea} onChange={(value) => { setLearningArea(value); setPage(1) }} />
            <button type="button" onClick={clearAll} className={`justify-self-start whitespace-nowrap text-[0.82rem] font-semibold underline underline-offset-4 transition-colors sm:justify-self-end sm:text-[0.9rem] ${hasActiveFilters ? 'text-brand-dark hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Clear all</button>
          </div>

          <div className="mt-6">
            {visibleResources.length === 0 ? <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center text-muted-foreground">No Source-linked resources match these filters yet.</div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visibleResources.map((resource) => <ResourceCard key={resource.id} resource={resource} saved={isActivitySaved(`resource-${resource.id}`)} onToggle={() => toggleSaveActivity(toSavedActivity(resource))} />)}</div>}
            <Pagination currentPage={safePage} totalPages={totalPages} resultCount={filteredResources.length} onChange={setPage} />
          </div>
        </div>
      </div>
    </section>
  )
}

interface FilterSidebarProps { sections: CategorySection[]; selectedFilters: Record<SearchFilterKey, string[]>; onToggle: (key: SearchFilterKey, option: string) => void }

function FilterSidebar({ sections, selectedFilters, onToggle }: FilterSidebarProps): ReactElement {
  const [openSections, setOpenSections] = useState<Record<SearchFilterKey, boolean>>({ ageStage: true, activityType: false, topic: false, eylfOutcome: false })
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  return <aside className="h-fit rounded-xl border border-border bg-card p-4 shadow-[0_12px_30px_-27px_rgba(63,81,54,0.55)] lg:sticky lg:top-5 lg:rounded-3xl"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-[1.05rem] font-bold text-brand-dark">Categories</h3><button type="button" onClick={() => setIsCollapsed((current) => !current)} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary" aria-label={isCollapsed ? 'Expand all categories' : 'Collapse all categories'} aria-expanded={!isCollapsed}>{isCollapsed ? <ChevronDown className="size-4" aria-hidden /> : <ChevronUp className="size-4" aria-hidden />}</button></div>{!isCollapsed && <div className="mt-2">{sections.map((section) => { const isOpen = openSections[section.key]; return <div key={section.key} className="border-b border-border last:border-b-0"><button type="button" onClick={() => setOpenSections((current) => ({ ...current, [section.key]: !current[section.key] }))} className="flex w-full items-center justify-between py-3 text-left text-[0.92rem] font-semibold text-foreground/80 transition-colors hover:text-primary" aria-expanded={isOpen}>{section.title}<ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden /></button>{isOpen && <div className="space-y-2 pb-3">{section.options.map((option) => <label key={option} className="flex min-w-0 cursor-pointer items-start gap-2 text-[0.8rem] font-semibold leading-snug text-muted-foreground"><input type="checkbox" checked={selectedFilters[section.key].includes(option)} onChange={() => onToggle(section.key, option)} className="mt-0.5 size-3.5 rounded border-border text-primary focus:ring-primary" />{displayActivityType(option)}</label>)}</div>}</div> })}</div>}</aside>
}

interface ResourceCardProps { resource: SearchResource; saved: boolean; onToggle: () => void }

function ResourceCard({ resource, saved, onToggle }: ResourceCardProps): ReactElement {
  const source = RESOURCE_SOURCE_WHITELIST[resource.source]
  return <article className="flex h-[376px] flex-col rounded-3xl border border-border bg-card p-5 shadow-[0_16px_36px_-30px_rgba(63,81,54,0.5)] transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(63,81,54,0.45)]">
    <div className="flex items-center justify-between gap-3 text-[0.8rem]">
      <span className="inline-flex items-center gap-1.5 font-bold text-primary" title={resource.classificationNote}>
        <ShieldCheck className="size-4" aria-hidden />Source-linked
      </span>
      <a href={resource.sourceUrl} target="_blank" rel="noopener noreferrer" className="truncate font-semibold text-muted-foreground hover:text-primary" title={`Whitelisted domain: ${source.domains.join(', ')}`}>{source.name}
      </a>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-card">
        <Image src={resource.image} alt="" fill sizes="(max-width: 640px) 44vw, (max-width: 1280px) 20vw, 180px" className="object-contain" style={resource.image.endsWith('activity-music-video.png') || resource.image.endsWith('activity-sensory-messy.png') ? {
          // Lift the paper tone to the white card and soften only the outermost edge.
          filter: 'brightness(1.035)',
          maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent), linear-gradient(to bottom, transparent, black 2%, black 98%, transparent)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        } : undefined} />
      </div>
      <div className="flex min-w-0 flex-col items-start justify-center gap-2">
        <ResourceAgeMeta age={resource.ageStage} />
        {resource.activityType !== 'None' && <span className="rounded-full bg-badge-green px-2.5 py-1 text-[0.68rem] font-semibold leading-snug text-badge-green-foreground">{displayActivityType(resource.activityType)}</span>}
      </div>
    </div>
    <h3 className="mt-4 line-clamp-2 min-h-[2.65rem] font-display text-[1.18rem] font-bold leading-tight text-brand-dark">{resource.title}</h3>
    <p className="mt-1.5 line-clamp-2 min-h-[3.1rem] text-[0.88rem] leading-relaxed text-muted-foreground">
      {resource.description}
    </p>
    <div className="mt-1.5 flex min-h-7 flex-wrap items-center gap-2">
      {resource.eylfOutcome !== undefined && <span className="flex min-h-7 items-center justify-center rounded-md bg-badge-yellow px-2.5 py-1 text-center text-[0.7rem] font-semibold leading-tight text-badge-yellow-foreground">{shortOutcome(resource.eylfOutcome)}</span>}
      {coreTopicFor(resource) !== 'None' && <span className="flex min-h-7 items-center justify-center rounded-md bg-muted px-2.5 py-1 text-center text-[0.7rem] font-semibold leading-tight text-foreground/75">{coreTopicFor(resource)}</span>}
    </div>
    <div className="mt-2 flex min-h-7 shrink-0 items-center justify-between gap-3 pt-1.5">
      <a href={resource.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-[0.8rem] font-bold text-primary underline decoration-1 underline-offset-4 transition-colors hover:text-brand-dark">View on Original Site <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      </a>
      <button type="button" onClick={onToggle} aria-label={saved ? 'Remove bookmark' : 'Save resource'} aria-pressed={saved} className="rounded-full p-1 text-primary transition-colors hover:bg-muted"><Bookmark className={`size-5 ${saved ? 'fill-primary text-primary' : ''}`} aria-hidden />
      </button>
    </div>
  </article>
}

function shortOutcome(outcome: string): string {
  const outcomeNumber = outcome.match(/^Outcome\s+(\d+)/)?.[1]
  return outcomeNumber === undefined ? outcome : `EYLF Outcome ${outcomeNumber}`
}
function diversifyBySource(resources: SearchResource[]): SearchResource[] {
  const resourcesBySource = new Map<SearchResource['source'], SearchResource[]>()
  for (const resource of resources) {
    const existing = resourcesBySource.get(resource.source) ?? []
    existing.push(resource)
    resourcesBySource.set(resource.source, existing)
  }

  const ordered: SearchResource[] = []
  // Round-robin the source queues. A greedy "largest source first" approach
  // made small, newly-imported providers invisible until later pages.
  let hasRemainingResources = true
  while (hasRemainingResources) {
    hasRemainingResources = false
    for (const [, remaining] of resourcesBySource) {
      const resource = remaining.shift()
      if (resource !== undefined) {
        ordered.push(resource)
        hasRemainingResources = true
      }
    }
  }

  return ordered
}

interface PaginationProps { currentPage: number; totalPages: number; resultCount: number; onChange: (page: number) => void }

function Pagination({ currentPage, totalPages, resultCount, onChange }: PaginationProps): ReactElement {
  const start = resultCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, resultCount)
  return <div className="mt-12 flex flex-col items-center gap-3"><div className="flex items-center gap-1.5"><PagerButton aria-label="Previous page" disabled={currentPage === 1} onClick={() => onChange(Math.max(1, currentPage - 1))}><ChevronLeft className="size-4" aria-hidden /></PagerButton>{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => onChange(pageNumber)} className={`flex size-9 items-center justify-center rounded-full text-[0.9rem] font-semibold transition-colors ${pageNumber === currentPage ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted'}`}>{pageNumber}</button>)}<PagerButton aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onChange(Math.min(totalPages, currentPage + 1))}><ChevronRight className="size-4" aria-hidden /></PagerButton></div><p className="text-[0.85rem] text-muted-foreground">Showing {start}–{end} of {resultCount} resources</p></div>
}

interface PagerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode }

function PagerButton({ children, ...props }: PagerButtonProps): ReactElement { return <button type="button" className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40" {...props}>{children}</button> }
