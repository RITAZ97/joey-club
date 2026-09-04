'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Leaf, Search, ShieldCheck } from 'lucide-react'
import { FilterDropdown } from '@/components/filter-dropdown'
import { useResourceSearch } from '@/components/resource-search-context'
import { type ActivityCard, type SavedItem, useSavedItems } from '@/components/saved-items'
import { RESOURCE_SOURCE_WHITELIST, SEARCH_RESOURCES, type ResourceFormat, type SearchResource } from '@/lib/resource-search'

type SearchFilterKey = 'ageStage' | 'setting' | 'activityType' | 'topic' | 'eylfOutcome'

interface CategorySection {
  key: SearchFilterKey
  title: string
  options: string[]
}

const categorySections: CategorySection[] = [
  { key: 'ageStage', title: 'Age & Stage', options: ['0 - 3 yrs (Babies & Toddlers)', '3 - 5 yrs (Kinders & Preschoolers)'] },
  { key: 'setting', title: 'Setting / Dynamic', options: ['Individual (1-on-1)', 'Group'] },
  { key: 'activityType', title: 'Activity Type', options: ['Arts & Crafts', 'STEM', 'Music & Movement', 'Literacy & Storytelling', 'Sensory & Messy Play', 'Outdoor & Physical Play'] },
  { key: 'topic', title: 'Topics & Themes', options: ['First Nations Culture', 'Cultures & Festivals', 'Sustainability & Nature', 'Social-Emotional Wellbeing'] },
  { key: 'eylfOutcome', title: 'EYLF 2.0 Outcomes', options: ['Outcome 1: Children have a strong sense of identity', 'Outcome 2: Children are connected with and contribute to their world', 'Outcome 3: Children have a strong sense of wellbeing', 'Outcome 4: Children are confident and involved learners', 'Outcome 5: Children are effective communicators'] },
]

const emptyFilters: Record<SearchFilterKey, string[]> = { ageStage: [], setting: [], activityType: [], topic: [], eylfOutcome: [] }
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
  'Arts & Crafts': '/cards/colour-sorting.png',
  STEM: '/cards/bubble-science.png',
  'Music & Movement': '/cards/shake-rhyme.png',
  'Literacy & Storytelling': '/cards/story-puppets.png',
  'Sensory & Messy Play': '/cards/water-pouring.png',
  'Outdoor & Physical Play': '/cards/little-gardeners.png',
}

const searchResourceAgeStages = ['0 - 3 yrs (Babies & Toddlers)', '3 - 5 yrs (Kinders & Preschoolers)'] as const
const searchResourceSettings = ['Individual (1-on-1)', 'Group'] as const
const searchResourceActivityTypes = ['Arts & Crafts', 'STEM', 'Music & Movement', 'Literacy & Storytelling', 'Sensory & Messy Play', 'Outdoor & Physical Play'] as const
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

function inferLearningArea(resource: SourceLinkedApiResource, activityType: (typeof searchResourceActivityTypes)[number]): (typeof searchResourceLearningAreas)[number] {
  const searchableText = `${resource.title} ${resource.description} ${resource.topic}`.toLowerCase()
  const typeArea: Partial<Record<(typeof searchResourceActivityTypes)[number], (typeof searchResourceLearningAreas)[number]>> = {
    'Arts & Crafts': 'Creative Expressive Arts',
    STEM: 'Cognition & Problem Solving',
    'Music & Movement': 'Gross & Fine Motor Skills',
    'Literacy & Storytelling': 'Language & Communication',
    'Sensory & Messy Play': 'Gross & Fine Motor Skills',
    'Outdoor & Physical Play': 'Gross & Fine Motor Skills',
  }

  // Imported records previously defaulted to Social & Emotional Learning when a
  // source did not expose a dedicated learning-area label. Prefer the activity
  // type in that situation so this filter describes what the child will do.
  if (resource.learningArea !== 'Social & Emotional Learning') {
    return asAllowedValue(resource.learningArea, searchResourceLearningAreas, typeArea[activityType] ?? 'Social & Emotional Learning')
  }
  if (/emotion|wellbeing|friendship|belonging|identity|kindness|self-regulation/.test(searchableText) && activityType === 'Literacy & Storytelling') {
    return 'Social & Emotional Learning'
  }
  return typeArea[activityType] ?? 'Social & Emotional Learning'
}

function asSearchResource(resource: SourceLinkedApiResource): SearchResource | null {
  const source = sourceSlugToId[resource.sourceSlug]
  if (source === undefined) return null
  const setting = /individual|one-to-one|at-home|family/i.test(resource.setting) ? 'Individual (1-on-1)' : 'Group'
  const activityType = asAllowedValue(resource.activityType, searchResourceActivityTypes, 'Arts & Crafts')
  const ageStage = asAllowedValue(resource.ageStage, searchResourceAgeStages, '3 - 5 yrs (Kinders & Preschoolers)')
  const eylfOutcome = resource.eylfOutcome !== null && searchResourceEylfOutcomes.includes(resource.eylfOutcome as (typeof searchResourceEylfOutcomes)[number])
    ? resource.eylfOutcome as (typeof searchResourceEylfOutcomes)[number]
    : undefined

  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    ages: ageStage.startsWith('0') ? '0-3' : '3-5',
    ageStage,
    setting: asAllowedValue(setting, searchResourceSettings, 'Group'),
    activityType,
    topic: asAllowedValue(resource.topic, searchResourceTopics, 'Social-Emotional Wellbeing'),
    ...(eylfOutcome === undefined ? {} : { eylfOutcome }),
    learningArea: inferLearningArea(resource, activityType),
    format: defaultResourceFormat,
    source,
    sourceUrl: resource.canonicalUrl,
    image: cardImageByActivityType[activityType] ?? '/cards/colour-sorting.png',
    classificationBasis: 'source_content',
    classificationNote: 'Source-linked from a trusted JoeyClub whitelist domain.',
    verificationStatus: 'source_linked',
  }
}

function toSavedActivity(resource: SearchResource): ActivityCard {
  const environment = /outdoor|physical|nature/i.test(`${resource.activityType} ${resource.topic}`) ? 'Outdoor' : 'Indoor'
  const ageGroup = resource.ages === '0-3' ? 'Toddlers' : 'Pre-school'
  const match = resource.eylfOutcome?.match(/^Outcome\s+(\d)/)?.[1]
  return { id: `resource-${resource.id}`, title: resource.title, description: resource.description, image: resource.image, sourceUrl: resource.sourceUrl, environment, ageGroup, eylfOutcomes: match ? [`Outcome ${match}` as ActivityCard['eylfOutcomes'][number]] : [], tags: [resource.activityType, resource.topic] }
}

export function EarlyYearsExplorer(): ReactElement {
  const { activeSearch, applyHeroSearch, userMode } = useResourceSearch()
  const [selectedFilters, setSelectedFilters] = useState<Record<SearchFilterKey, string[]>>(emptyFilters)
  const [explorerQuery, setExplorerQuery] = useState<string>(activeSearch.query)
  const [learningArea, setLearningArea] = useState<string>(learningAreaOptions[0])
  const [page, setPage] = useState<number>(1)
  const { isActivitySaved, toggleSaveActivity, isTagSaved, toggleSaveTag } = useSavedItems()
  const [sourceLinkedResources, setSourceLinkedResources] = useState<SearchResource[]>([])

  useEffect(() => {
    let isCurrent = true
    void fetch('/api/resources?limit=50')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load Source-linked resources.')
        return response.json() as Promise<SourceLinkedApiResponse>
      })
      .then((response) => {
        if (!isCurrent) return
        setSourceLinkedResources(response.data.map(asSearchResource).filter((resource): resource is SearchResource => resource !== null))
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
    return [...sourceLinkedResources, ...SEARCH_RESOURCES.filter((resource) => !sourceLinkedUrls.has(resource.sourceUrl))]
  }, [sourceLinkedResources])

  const filteredResources = useMemo<SearchResource[]>(() => searchResources.filter((resource) => {
    const categoryMatches = categorySections.every((section) => {
      const selectedValues = selectedFilters[section.key]
      const resourceValue = resource[section.key]
      return selectedValues.length === 0 || (typeof resourceValue === 'string' && selectedValues.includes(resourceValue))
    })
    const areaMatches = learningArea === learningAreaOptions[0] || resource.learningArea === learningArea
    const normalizedQuery = explorerQuery.trim().toLowerCase()
    const keywordMatches = normalizedQuery.length === 0 || [resource.title, resource.description, resource.topic, resource.activityType, resource.learningArea].join(' ').toLowerCase().includes(normalizedQuery)
    const heroAgeMatches = activeSearch.age === 'Any age' || resource.ageStage === activeSearch.age
    const heroGroupMatches = activeSearch.group === 'Any group size' || resource.setting === activeSearch.group
    return categoryMatches && areaMatches && keywordMatches && heroAgeMatches && heroGroupMatches
  }), [activeSearch, explorerQuery, learningArea, searchResources, selectedFilters])

  useEffect(() => { setPage(1) }, [activeSearch])
  useEffect(() => { setExplorerQuery(activeSearch.query) }, [activeSearch.query])

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const diversifiedResources = useMemo<SearchResource[]>(() => diversifyBySource(filteredResources), [filteredResources])
  const hasExplicitSetting = activeSearch.group !== 'Any group size' || selectedFilters.setting.length > 0
  const modeBalancedResources = useMemo<SearchResource[]>(
    () => userMode === 'parent' && !hasExplicitSetting ? balanceParentResources(diversifiedResources) : diversifiedResources,
    [diversifiedResources, hasExplicitSetting, userMode],
  )
  const visibleResources = modeBalancedResources.slice((safePage - 1) * pageSize, safePage * pageSize)
  const hasActiveFilters = categorySections.some((section) => selectedFilters[section.key].length > 0) || explorerQuery.trim().length > 0 || learningArea !== learningAreaOptions[0] || activeSearch.age !== 'Any age' || activeSearch.group !== 'Any group size'

  const toggleFilter = (key: SearchFilterKey, option: string): void => {
    setSelectedFilters((current) => ({ ...current, [key]: current[key].includes(option) ? current[key].filter((value) => value !== option) : [...current[key], option] }))
    setPage(1)
  }
  const clearAll = (): void => { setSelectedFilters(emptyFilters); setExplorerQuery(''); setLearningArea(learningAreaOptions[0]); applyHeroSearch({ query: '', age: 'Any age', group: 'Any group size' }); setPage(1) }

  return (
    <section id="early-years-explorer" className="mx-auto w-full scroll-mt-6 px-5 py-9 sm:py-12 lg:w-[95%] lg:max-w-[1400px] lg:px-10 lg:py-14">
      <div className="flex items-end justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="font-display text-[clamp(1.85rem,7vw,2.4rem)] font-bold tracking-tight text-brand-dark">Early Years Explorer</h2>
          <p className="mt-1 text-[0.86rem] text-muted-foreground sm:mt-1.5 sm:text-[1rem]">Discover safe, age-appropriate learning ideas.</p>
        </div>
        <Leaf className="mb-2 hidden size-8 text-primary/50 lg:block" aria-hidden />
      </div>

      <div className="mt-6 grid gap-5 sm:mt-7 sm:gap-6 lg:mt-8 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <FilterSidebar sections={categorySections} selectedFilters={selectedFilters} onToggle={toggleFilter} isTagSaved={isTagSaved} onToggleTag={toggleSaveTag} />
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

interface FilterSidebarProps { sections: CategorySection[]; selectedFilters: Record<SearchFilterKey, string[]>; onToggle: (key: SearchFilterKey, option: string) => void; isTagSaved: (type: 'eylf' | 'theme', id: string) => boolean; onToggleTag: (type: 'eylf' | 'theme', item: Omit<SavedItem, 'type' | 'savedAt'>) => void }

function FilterSidebar({ sections, selectedFilters, onToggle, isTagSaved, onToggleTag }: FilterSidebarProps): ReactElement {
  const [openSections, setOpenSections] = useState<Record<SearchFilterKey, boolean>>({ ageStage: true, setting: true, activityType: false, topic: false, eylfOutcome: false })
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  return <aside className="h-fit rounded-xl border border-border bg-card p-4 shadow-[0_12px_30px_-27px_rgba(63,81,54,0.55)] lg:sticky lg:top-5 lg:rounded-3xl"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-[1.05rem] font-bold text-brand-dark">Categories</h3><button type="button" onClick={() => setIsCollapsed((current) => !current)} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary" aria-label={isCollapsed ? 'Expand all categories' : 'Collapse all categories'} aria-expanded={!isCollapsed}>{isCollapsed ? <ChevronDown className="size-4" aria-hidden /> : <ChevronUp className="size-4" aria-hidden />}</button></div>{!isCollapsed && <div className="mt-2">{sections.map((section) => { const isOpen = openSections[section.key]; return <div key={section.key} className="border-b border-border last:border-b-0"><button type="button" onClick={() => setOpenSections((current) => ({ ...current, [section.key]: !current[section.key] }))} className="flex w-full items-center justify-between py-3 text-left text-[0.92rem] font-semibold text-foreground/80 transition-colors hover:text-primary" aria-expanded={isOpen}>{section.title}<ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden /></button>{isOpen && <div className="space-y-2 pb-3">{section.options.map((option) => <div key={option} className="flex items-start gap-2 text-[0.8rem] font-semibold leading-snug text-muted-foreground"><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2"><input type="checkbox" checked={selectedFilters[section.key].includes(option)} onChange={() => onToggle(section.key, option)} className="mt-0.5 size-3.5 rounded border-border text-primary focus:ring-primary" />{option}</label>{section.key === 'eylfOutcome' && <button type="button" onClick={() => onToggleTag('eylf', { id: `eylf-${option}`, title: option, eylfOutcomes: [] })} aria-label={`${isTagSaved('eylf', `eylf-${option}`) ? 'Unsave' : 'Save'} ${option}`} className="shrink-0 rounded p-0.5 text-primary hover:bg-muted"><Bookmark className={`size-4 ${isTagSaved('eylf', `eylf-${option}`) ? 'fill-primary' : ''}`} /></button>}</div>)}</div>}</div> })}</div>}</aside>
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
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream">
        <Image src={resource.image} alt="" fill className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-col items-start justify-center gap-2">
        <span className="font-display text-[1rem] font-bold leading-tight text-brand-dark">{resource.ages} yrs / {metaSetting(resource.setting)}</span>
        <span className="rounded-full bg-badge-green px-2.5 py-1 text-[0.68rem] font-semibold leading-snug text-badge-green-foreground">{resource.activityType}</span>
      </div>
    </div>
    <h3 className="mt-4 line-clamp-2 min-h-[2.65rem] font-display text-[1.18rem] font-bold leading-tight text-brand-dark">{resource.title}</h3>
    <p className="mt-1.5 line-clamp-2 min-h-[3.1rem] text-[0.88rem] leading-relaxed text-muted-foreground">
      {resource.description}
    </p>
    <div className="mt-1.5 flex min-h-7 flex-wrap items-center gap-2">
      {resource.eylfOutcome !== undefined && <span className="flex min-h-7 items-center justify-center rounded-md bg-badge-yellow px-2.5 py-1 text-center text-[0.7rem] font-semibold leading-tight text-badge-yellow-foreground">{shortOutcome(resource.eylfOutcome)}</span>}
      <span className="flex min-h-7 items-center justify-center rounded-md bg-muted px-2.5 py-1 text-center text-[0.7rem] font-semibold leading-tight text-foreground/75">{resource.topic}</span>
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
function metaSetting(setting: string): string {
  if (setting === 'Individual (1-on-1)') return 'Individual'
  return setting === 'Group' ? 'Group' : setting.replace(' (1-on-1)', '')
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

function balanceParentResources(resources: SearchResource[]): SearchResource[] {
  const individualResources = resources.filter((resource) => resource.setting === 'Individual (1-on-1)')
  const familyResources = resources.filter((resource) => resource.setting === 'Group')
  const selected = [...individualResources.slice(0, 8), ...familyResources.slice(0, 4)]
  const selectedIds = new Set(selected.map((resource) => resource.id))
  return [...selected, ...resources.filter((resource) => !selectedIds.has(resource.id))]
}

interface PaginationProps { currentPage: number; totalPages: number; resultCount: number; onChange: (page: number) => void }

function Pagination({ currentPage, totalPages, resultCount, onChange }: PaginationProps): ReactElement {
  const start = resultCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, resultCount)
  return <div className="mt-12 flex flex-col items-center gap-3"><div className="flex items-center gap-1.5"><PagerButton aria-label="Previous page" disabled={currentPage === 1} onClick={() => onChange(Math.max(1, currentPage - 1))}><ChevronLeft className="size-4" aria-hidden /></PagerButton>{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => onChange(pageNumber)} className={`flex size-9 items-center justify-center rounded-full text-[0.9rem] font-semibold transition-colors ${pageNumber === currentPage ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted'}`}>{pageNumber}</button>)}<PagerButton aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onChange(Math.min(totalPages, currentPage + 1))}><ChevronRight className="size-4" aria-hidden /></PagerButton></div><p className="text-[0.85rem] text-muted-foreground">Showing {start}–{end} of {resultCount} resources</p></div>
}

interface PagerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode }

function PagerButton({ children, ...props }: PagerButtonProps): ReactElement { return <button type="button" className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40" {...props}>{children}</button> }
