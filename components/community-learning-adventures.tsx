'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Heart, MapPin, RotateCcw } from 'lucide-react'
import { type UserMode, useResourceSearch } from '@/components/resource-search-context'
import { type ActivityCard, useSavedItems } from '@/components/saved-items'
import { canonicalAgeStage, discoverySearchScore } from '@/lib/resource-discovery'

type AdventureKind = 'incursion' | 'excursion' | 'indoor' | 'outdoor'

const states = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const
type StateCode = (typeof states)[number]
const allAustralia = 'Australia-wide' as const
type StateFilter = StateCode | typeof allAustralia

interface Adventure {
  id: string
  title: string
  description: string
  image: string
  category: string
  tags: readonly string[]
  experienceTags?: readonly ExperienceTag[]
  url?: string
  location?: string
  stateCode?: StateCode
  providerName?: string
  ageStage?: string
}

type ExperienceTag =
  | 'Animal Encounters'
  | 'Nature & Sustainability'
  | 'First Nations Perspectives'
  | 'STEM & Discovery'
  | 'Language & Literacy'
  | 'Arts, Music & Creativity'
  | 'Movement & Wellbeing'
  | 'Sensory & Hands-on'
  | 'Social Skills & Teamwork'
  | 'Community & Life Skills'

interface AdventureSection {
  id: AdventureKind
  title: string
  dropdownLabel: string
  allLabel: string
  categories: readonly string[]
  adventures: readonly Adventure[]
}

const parentSections: readonly AdventureSection[] = [
  {
    id: 'indoor', title: 'Indoor Activities & Venues', dropdownLabel: 'All Indoor Types', allLabel: 'All Indoor',
    categories: ['Playcentres & Party Venues', 'Art, Craft & Sensory', 'Sports & Active', 'Museums & Storytime', 'Other'],
    adventures: [
      { id: 'sensory', title: 'Rainy Day Sensory Lab', description: 'A playful, hands-on lab for messy exploration and discovery.', image: '/cards/outing-sensory-play.png', category: 'Art, Craft & Sensory', tags: ['Indoor Fun', 'Messy Play'] },
      { id: 'museum', title: 'Interactive Kids’ Science Museum', description: 'Touch, test and discover together in a child-friendly science space.', image: '/cards/outing-stem-science.png', category: 'Museums & Storytime', tags: ['Indoor', 'STEM'] },
    ],
  },
  {
    id: 'outdoor', title: 'Outdoor Activities & Outings', dropdownLabel: 'All Outdoor Types', allLabel: 'All Outdoor',
    categories: ['Parks & Playground Adventures', 'Farm & Animal Visits', 'Nature Walks & Trails', 'Community Gardens & Sustainability', 'Other'],
    adventures: [
      { id: 'scavenger', title: 'Nature Scavenger Hunt', description: 'Explore local parks while spotting leaves, bugs and hidden treasures.', image: '/cards/outing-nature-outdoor.png', category: 'Nature Walks & Trails', tags: ['Outdoor Exploration', 'Family'] },
      { id: 'garden', title: 'Community Veggie Garden Dig', description: 'Get your hands dirty and grow fresh vegetables together.', image: '/cards/outing-garden-sustainability.png', category: 'Community Gardens & Sustainability', tags: ['Sustainability', 'Family'] },
    ],
  },
]

const educatorSections: readonly AdventureSection[] = [
  {
    id: 'incursion', title: 'Incursion', dropdownLabel: 'All Incursion Types', allLabel: 'All Incursions',
    categories: ['Animals & Nature', 'First Nations & Culture', 'Multicultural & Arts', 'STEM & Science', 'Performing Arts & Drama', 'Other'],
    adventures: [
      { id: 'museum-van', title: 'Museum In A Van Incursion Dinosaurs And Fossils', description: 'Bring museum learning into your setting with a hands-on dinosaurs and fossils incursion.', image: '/cards/outing-stem-science.png', category: 'STEM & Science', tags: ['Incursion', 'STEM & Nature'] },
      { id: 'reptile', title: 'Reptile Encounters Incursion', description: 'A safe, engaging animal encounter that brings nature close.', image: '/cards/outing-animal-encounters.png', category: 'Animals & Nature', tags: ['Incursion', 'EYLF Outcome 2'] },
      { id: 'rhythm', title: 'Aussie Rhythm Workshop', description: 'An interactive drumming circle for listening, teamwork and joy.', image: '/cards/outing-music-movement.png', category: 'Multicultural & Arts', tags: ['Incursion', 'Music & Dance'] },
    ],
  },
  {
    id: 'excursion', title: 'Excursion', dropdownLabel: 'All Excursion Types', allLabel: 'All Excursions',
    categories: ['Safety & Community Hubs', 'Animals & Wildlife', 'Parks & Bush Kinder', 'Museums & Discovery', 'Other'],
    adventures: [
      { id: 'fire', title: 'Local Fire Station Visit', description: 'Meet the crew and learn simple ways to stay safe together.', image: '/cards/outing-community-safety.png', category: 'Safety & Community Hubs', tags: ['Excursion', 'Community Hubs'] },
      { id: 'early-learning-outdoors', title: 'Early Learning Outdoors', description: 'This Parks Victoria resource supports early childhood educators in establishing Bush Kinder programs and outdoor learning.', image: '/cards/outing-nature-outdoor.png', category: 'Parks & Bush Kinder', tags: ['Excursion', 'Sustainability & Nature'] },
    ],
  },
]

const pageSize = 4

function stateCodeFrom(value: string | null | undefined, fallback: StateCode): StateCode {
  const text = value?.toUpperCase() ?? ''
  const exactMatch = states.find((state) => new RegExp(`\\b${state}\\b`).test(text))
  if (exactMatch) return exactMatch
  if (/SYDNEY|NEWCASTLE|WOLLONGONG/.test(text)) return 'NSW'
  if (/MELBOURNE|GEELONG|BALLARAT/.test(text)) return 'VIC'
  if (/BRISBANE|GOLD COAST|SUNSHINE COAST/.test(text)) return 'QLD'
  if (/ADELAIDE/.test(text)) return 'SA'
  if (/PERTH|FREMANTLE/.test(text)) return 'WA'
  if (/HOBART|LAUNCESTON/.test(text)) return 'TAS'
  if (/DARWIN|ALICE SPRINGS/.test(text)) return 'NT'
  if (/CANBERRA/.test(text)) return 'ACT'
  if (/VICTORIA/.test(text)) return 'VIC'
  if (/NEW SOUTH WALES/.test(text)) return 'NSW'
  if (/QUEENSLAND/.test(text)) return 'QLD'
  if (/SOUTH AUSTRALIA/.test(text)) return 'SA'
  if (/WESTERN AUSTRALIA/.test(text)) return 'WA'
  if (/TASMANIA/.test(text)) return 'TAS'
  if (/NORTHERN TERRITORY/.test(text)) return 'NT'
  if (/AUSTRALIAN CAPITAL TERRITORY/.test(text)) return 'ACT'
  return fallback
}

interface ResourceRoute { title?: string; description?: string; experienceTags: readonly ExperienceTag[]; url: string; location: string; providerName?: string }
const resourceRoutes: Record<string, ResourceRoute> = {
  sensory: { title: 'Twisted Science STEM Playcentre', description: 'Hands-on interactive science playrooms, birthday parties and indoor discovery for young curious minds.', experienceTags: ['STEM & Discovery', 'Sensory & Hands-on'], url: 'https://www.twistedscience.com.au/', location: 'Multiple Victorian locations', providerName: 'Twisted Science' },
  museum: { title: 'Melbourne Paint Lab Art Workshop', description: 'A guided hands-on art workshop for families who love to splash, paint and make.', experienceTags: ['Arts, Music & Creativity', 'Sensory & Hands-on'], url: 'https://whatson.melbourne.vic.gov.au/things-to-do/melbourne-paint-lab-art-workshop', location: 'Melbourne CBD' },
  scavenger: { title: 'Collingwood Children’s Farm Outing', description: 'Meet farm animals, wander riverside paths and enjoy a gentle family day outdoors.', experienceTags: ['Animal Encounters', 'Nature & Sustainability'], url: 'https://www.farm.org.au/visit-us', location: 'Abbotsford, VIC' },
  garden: { title: 'Ian Potter Children’s Garden', description: 'Discover water play, plant tunnels and nature adventures made for young children.', experienceTags: ['Nature & Sustainability', 'Sensory & Hands-on'], url: 'https://www.rbg.vic.gov.au/melbourne-gardens/discover-melbourne-gardens/melbourne-gardens-living-collections/the-ian-potter-foundation-childrens-garden/', location: 'Melbourne Gardens' },
  'museum-van': { title: 'Museum In A Van Incursion Dinosaurs And Fossils', description: 'Bring museum learning into your setting with a hands-on dinosaurs and fossils incursion.', experienceTags: ['STEM & Discovery', 'Sensory & Hands-on'], url: 'https://museumsvictoria.com.au/learning/outreach-programs/museum-in-a-van/', location: 'Victoria-wide', providerName: 'Museums Victoria' },
  reptile: { title: 'Reptile Encounters Classroom Show', description: 'A safe, hands-on native wildlife experience designed for curious preschool learners.', experienceTags: ['Animal Encounters', 'Nature & Sustainability'], url: 'https://www.reptileencounters.com.au/school-incursions', location: 'Victoria-wide service', providerName: 'Reptile Encounters' },
  rhythm: { title: 'Little Sports Heroes Incursion', description: 'Playful movement games and confidence-building activities delivered at your early learning setting.', experienceTags: ['Movement & Wellbeing', 'Social Skills & Teamwork'], url: 'https://www.littleheroesaustralia.com/sports-victoria', location: 'Victoria-wide service' },
  fire: { title: 'Fire Rescue Victoria Station Visit', description: 'Connect with local fire safety learning, firefighter meet-and-greets and community events.', experienceTags: ['Community & Life Skills', 'STEM & Discovery'], url: 'https://www.frv.vic.gov.au/community-events', location: 'Victoria-wide', providerName: 'Fire Rescue Victoria' },
  'early-learning-outdoors': { title: 'Early Learning Outdoors', description: 'This Parks Victoria resource supports early childhood educators in establishing Bush Kinder programs and outdoor learning.', experienceTags: ['Nature & Sustainability', 'Movement & Wellbeing'], url: 'https://www.parks.vic.gov.au/get-into-nature/learning-in-nature/early-learning-outdoors', location: 'Victoria-wide', providerName: 'Parks Victoria' },
}

function stateForAdventure(adventure: Adventure): StateCode {
  const route = resourceRoutes[adventure.id]
  return adventure.stateCode ?? stateCodeFrom(route?.location ?? adventure.location, 'VIC')
}

interface OutingApiResource {
  id: string
  title: string
  description: string
  canonicalUrl: string
  activityType: string
  topic: string
  ageStage?: string
  eylfOutcome?: string | null
  stateTerritory?: string | null
  metadata?: Record<string, unknown> | null
  experienceTags?: string[]
}

/**
 * Matches each incursion/excursion resource to the most relevant illustration
 * in public/cards by keyword, before falling back to a generic STEM/nature
 * cover. Order matters: more specific themes (yoga, puppetry, aquarium) are
 * checked before broader ones (general animals, nature) so a shared word
 * doesn't shadow the more precise match. Gardening/sustainability splits on
 * whether a provider comes in (an Incursion gets the gardening illustration)
 * or the group instead travels to a garden/park/bush-kinder site (an
 * Excursion or outdoor venue gets the general STEM & nature cover).
 */
const adventureImageRules: Array<{ test: (text: string, isIncursion: boolean) => boolean; image: string }> = [
  { test: (text) => /yoga|mindful|meditation/i.test(text), image: '/cards/incursion-yoga.png' },
  { test: (text) => /puppet|drama|theatre|theater|stage\s*show|performance/i.test(text), image: '/cards/adventure-drama.jpeg' },
  { test: (text) => /\bdisco\b|\bdj\b|music|song|singalong|choir|\bdance\b|rhythm|drum/i.test(text), image: '/cards/activity-music-video.png' },
  { test: (text) => /aquarium|sea\s*life|marine|\bocean\b|shark|turtle/i.test(text), image: '/cards/adventure-aquarium.png' },
  { test: (text) => /animal|wildlife|reptile|\bzoo\b|farm|petting/i.test(text), image: '/cards/adventure-animal.png' },
  { test: (text, isIncursion) => isIncursion && /garden|sustainab|veggie|plant|compost/i.test(text), image: '/cards/adventure-gardening.jpeg' },
  { test: (text) => /garden|sustainab|\bpark\b|bush\s*kinder|botanic|nature\s*play/i.test(text), image: '/cards/activity-stem-nature.png' },
  { test: (text) => /science|stem|museum|dinosaur|fossil|discovery|space|robot/i.test(text), image: '/cards/outing-stem-science.png' },
  { test: (text) => /sensory|messy|water play|playdough|slime/i.test(text), image: '/cards/outing-sensory-play.png' },
  { test: (text) => /safety|fire|police|community hub|first aid/i.test(text), image: '/cards/outing-community-safety.png' },
  { test: (text) => /story|storytelling|book|literacy|letters|reading/i.test(text), image: '/cards/activity-stories-letters.png' },
  { test: (text) => /art|craft|paint|creative|expressive|pottery/i.test(text), image: '/cards/activity-arts-crafts.png' },
  { test: (text) => /physical|sport|gross motor|active play|gymnastics|movement/i.test(text), image: '/cards/activity-outdoor-physical.png' },
  { test: (text) => /nature|bush|outdoor/i.test(text), image: '/cards/outing-nature-outdoor.png' },
]

function pickAdventureImage(row: OutingApiResource, isIncursion: boolean): string {
  const searchableText = `${row.title} ${row.activityType} ${row.topic} ${row.description}`
  const rule = adventureImageRules.find(({ test }) => test(searchableText, isIncursion))
  if (rule) return rule.image
  return isIncursion ? '/cards/outing-stem-science.png' : '/cards/outing-nature-outdoor.png'
}

function adventuresFromApi(rows: readonly OutingApiResource[]): { incursion: Adventure[]; excursion: Adventure[] } {
  const result = { incursion: [], excursion: [] } as { incursion: Adventure[]; excursion: Adventure[] }
  for (const row of rows) {
    const isIncursion = /incursion/i.test(row.activityType)
    const kind = isIncursion ? 'incursion' : 'excursion'
    const topic = row.topic || 'STEM & Discovery'
    const tags = Array.isArray(row.experienceTags) && row.experienceTags.length > 0 ? row.experienceTags : [topic]
    const metadata = row.metadata ?? {}
    const providerName = typeof metadata.providerName === 'string' ? metadata.providerName : undefined
    const metadataLocation = [metadata.stateTerritory, metadata.state, metadata.location].find((value): value is string => typeof value === 'string')
    const location = row.stateTerritory ?? metadataLocation ?? 'Australia-wide'
    const stateCode = stateCodeFrom(`${location} ${row.title} ${row.canonicalUrl}`, 'VIC')
    const category = isIncursion
      ? (/animal|wildlife/i.test(`${row.title} ${row.description} ${topic}`) ? 'Animals & Nature' : /culture|first nations/i.test(`${row.title} ${row.description} ${topic}`) ? 'First Nations & Culture' : /art|music|creative/i.test(`${row.title} ${row.description} ${topic}`) ? 'Multicultural & Arts' : 'STEM & Science')
      : (/animal|wildlife|zoo|aquarium|farm/i.test(`${row.title} ${row.description}`) ? 'Animals & Wildlife' : /park|garden|nature|bush|outdoor/i.test(`${row.title} ${row.description} ${topic}`) ? 'Parks & Bush Kinder' : /museum|science|discovery/i.test(`${row.title} ${row.description} ${topic}`) ? 'Museums & Discovery' : 'Safety & Community Hubs')
    const adventure: Adventure = { id: `db-${row.id}`, title: row.title, description: row.description, image: pickAdventureImage(row, isIncursion), category, tags, experienceTags: tags as ExperienceTag[], url: row.canonicalUrl, location, stateCode, providerName, ageStage: row.ageStage }
    result[kind].push(adventure)
  }
  return result
}

export function CommunityLearningAdventures(): ReactElement {
  const { activeSearch, userMode, setUserMode } = useResourceSearch()
  const { isActivitySaved, toggleSaveActivity } = useSavedItems()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [pages, setPages] = useState<Record<string, number>>({})
  const [openFilter, setOpenFilter] = useState<AdventureKind | null>(null)
  const [stateFilter, setStateFilter] = useState<StateFilter>(allAustralia)
  const [databaseOutings, setDatabaseOutings] = useState<{ incursion: Adventure[]; excursion: Adventure[] } | null>(null)
  useEffect(() => {
    let cancelled = false
    void fetch('/api/resources?category=outing&limit=100')
      .then((response) => response.ok ? response.json() as Promise<{ data?: OutingApiResource[] }> : null)
      .then((payload) => { if (!cancelled && payload?.data) setDatabaseOutings(adventuresFromApi(payload.data)) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const sections = useMemo(() => {
    const effectiveMode: UserMode = activeSearch.scope === 'Outings' ? 'educator' : activeSearch.scope === 'Venues' ? 'parent' : userMode
    if (effectiveMode === 'parent' || !databaseOutings) return effectiveMode === 'parent' ? parentSections : educatorSections
    return educatorSections.map((section) => section.id === 'incursion' ? { ...section, adventures: databaseOutings.incursion } : section.id === 'excursion' ? { ...section, adventures: databaseOutings.excursion } : section)
  }, [activeSearch.scope, databaseOutings, userMode])
  const adventureQuery = activeSearch.scope === 'Learning ideas' ? '' : activeSearch.query

  const setMode = (mode: UserMode): void => {
    setUserMode(mode)
    setOpenFilter(null)
  }

  return <section id="community-adventures" className="mx-auto w-full scroll-mt-6 px-5 py-10 sm:py-12 lg:w-[95%] lg:max-w-[1400px] lg:px-10 lg:py-14">
    <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between xl:gap-8">
      <div className="min-w-0">
        <h2 className="font-display text-[clamp(1.85rem,7vw,2.4rem)] font-bold leading-tight tracking-tight text-brand-dark">Community &amp; Learning Adventures</h2>
        <p className="mt-2 max-w-xl text-[0.95rem] text-muted-foreground sm:text-[1.05rem]">{userMode === 'parent' ? 'Curated places to play, create and explore together.' : 'Curated incursions and excursions for early learning groups.'}</p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6 xl:w-auto xl:flex-nowrap xl:justify-end">
        <StateFilterControl value={stateFilter} onChange={(state) => { setStateFilter(state); setPages({}) }} />
        <div className="flex w-full shrink-0 rounded-full border border-border bg-card p-1 shadow-sm sm:w-[17rem] xl:w-[16rem]"><ModeButton active={userMode === 'parent'} onClick={() => setMode('parent')}>Parent</ModeButton><ModeButton active={userMode === 'educator'} onClick={() => setMode('educator')}>Educator</ModeButton></div>
      </div>
    </header>
    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><span>{stateFilter === allAustralia ? 'Showing resources across Australia' : <>Showing resources for <strong className="font-semibold text-brand-dark">{stateFilter}</strong></>}</span><button type="button" onClick={() => { setStateFilter(allAustralia); setPages({}) }} disabled={stateFilter === allAustralia} aria-label="Reset state filter to Australia-wide" title="Reset to Australia-wide" className="group inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-45"><RotateCcw className="size-4 transition-transform duration-300 group-hover:-rotate-180" aria-hidden /></button></div>
    <div className="mt-8 space-y-10 lg:mt-10 lg:space-y-12">
      {sections.map((section) => <AdventureCollection key={section.id} section={section} filter={filters[section.id] ?? section.allLabel} page={pages[section.id] ?? 1} isFilterOpen={openFilter === section.id} onToggleFilter={() => setOpenFilter((current) => current === section.id ? null : section.id)} onFilterChange={(value) => { setFilters((current) => ({ ...current, [section.id]: value })); setPages((current) => ({ ...current, [section.id]: 1 })); setOpenFilter(null) }} onPageChange={(page) => setPages((current) => ({ ...current, [section.id]: page }))} stateFilter={stateFilter} query={adventureQuery} age={activeSearch.age} isActivitySaved={isActivitySaved} onToggleSaved={(adventure) => toggleSaveActivity(toAdventureActivity(adventure, section.id))} />)}
    </div>
  </section>
}

interface ModeButtonProps { active: boolean; onClick: () => void; children: string }
function ModeButton({ active, onClick, children }: ModeButtonProps): ReactElement { return <button type="button" onClick={onClick} className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition-colors sm:px-4 sm:text-base ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/80 hover:text-primary'}`}>{children}</button> }

interface StateFilterControlProps { value: StateFilter; onChange: (state: StateFilter) => void }
function StateFilterControl({ value, onChange }: StateFilterControlProps): ReactElement {
  const [openState, setOpenState] = useState(false)
  const options: readonly StateFilter[] = [allAustralia, ...states]
  return <div className="min-w-0 text-left sm:flex sm:items-center sm:gap-2"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-dark sm:mb-0">State</span><div className="relative w-full sm:w-[10.5rem]"><button type="button" onClick={() => setOpenState((open) => !open)} aria-label="Select state" aria-expanded={openState} className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-primary bg-card px-4 py-2.5 text-left text-sm font-semibold text-foreground shadow-sm"><span className="truncate">{value}</span><ChevronDown className={`size-4 shrink-0 text-primary transition-transform ${openState ? 'rotate-180' : ''}`} /></button>{openState && <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{options.map((state) => <FilterChoice key={state} active={value === state} onClick={() => { onChange(state); setOpenState(false) }}>{state}</FilterChoice>)}</div>}</div></div>
}

function toAdventureActivity(adventure: Adventure, section: AdventureKind): ActivityCard {
  const experienceTags = resourceRoutes[adventure.id]?.experienceTags ?? adventure.experienceTags ?? []
  return { id: `adventure-${adventure.id}`, title: adventure.title, description: adventure.description, image: adventure.image, sourceUrl: resourceRoutes[adventure.id]?.url ?? 'https://www.twinkl.com.au/', environment: section === 'outdoor' || section === 'excursion' ? 'Outdoor' : 'Indoor', ageGroup: 'Pre-school', eylfOutcomes: [], tags: experienceTags.slice(0, 1) }
}

interface AdventureCollectionProps { section: AdventureSection; filter: string; page: number; isFilterOpen: boolean; onToggleFilter: () => void; onFilterChange: (value: string) => void; onPageChange: (page: number) => void; stateFilter: StateFilter; query: string; age: string; isActivitySaved: (id: string) => boolean; onToggleSaved: (adventure: Adventure) => void }
function AdventureCollection({ section, filter, page, isFilterOpen, onToggleFilter, onFilterChange, onPageChange, stateFilter, query, age, isActivitySaved, onToggleSaved }: AdventureCollectionProps): ReactElement {
  const filtered = useMemo(() => section.adventures.map((adventure) => ({
    adventure,
    score: discoverySearchScore({ title: resourceRoutes[adventure.id]?.title ?? adventure.title, description: resourceRoutes[adventure.id]?.description ?? adventure.description, activityType: section.title, topic: adventure.category, tags: resourceRoutes[adventure.id]?.experienceTags ?? adventure.experienceTags ?? adventure.tags }, query),
  })).filter(({ adventure, score }) => (filter === section.allLabel || adventure.category === filter) && (stateFilter === allAustralia || stateForAdventure(adventure) === stateFilter) && (age === 'All ages' || adventure.ageStage === undefined || canonicalAgeStage(adventure.ageStage) === age || canonicalAgeStage(adventure.ageStage) === 'All ages') && score > 0).sort((left, right) => query.trim().length > 0 ? right.score - left.score : 0).map(({ adventure }) => adventure), [age, filter, query, section, stateFilter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activePage = Math.min(page, totalPages)
  const visible = filtered.slice((activePage - 1) * pageSize, activePage * pageSize)
  return <section aria-labelledby={`${section.id}-title`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><h3 id={`${section.id}-title`} className="font-display text-[clamp(1.45rem,6vw,2rem)] font-bold text-brand-dark">{section.title}</h3><div className="hidden h-px flex-1 bg-primary/75 sm:block" /><div className="relative self-start"><button type="button" onClick={onToggleFilter} aria-expanded={isFilterOpen} className="inline-flex min-w-[15rem] items-center justify-between gap-3 rounded-lg border border-primary bg-card px-4 py-2.5 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"><span>Category: {filter === section.allLabel ? section.dropdownLabel : filter}</span><ChevronDown className={`mr-1 size-4 shrink-0 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} /></button>{isFilterOpen && <div className="absolute left-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]"><FilterChoice active={filter === section.allLabel} onClick={() => onFilterChange(section.allLabel)}>{section.allLabel}</FilterChoice>{section.categories.map((category) => <FilterChoice key={category} active={filter === category} onClick={() => onFilterChange(category)}>{category}</FilterChoice>)}</div>}</div></div>
    <div className="mt-5 lg:mt-6">{visible.length > 0 ? <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">{visible.map((adventure) => <AdventureCard key={adventure.id} adventure={adventure} saved={isActivitySaved(`adventure-${adventure.id}`)} onToggleSaved={() => onToggleSaved(adventure)} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-10 text-center text-sm text-muted-foreground">No resources match this search and state yet. Try another keyword or reset to Australia-wide.</div>}</div>
    {visible.length > 0 && <Pagination currentPage={activePage} totalPages={totalPages} onChange={onPageChange} />}
  </section>
}

interface FilterChoiceProps { active: boolean; onClick: () => void; children: string }
function FilterChoice({ active, onClick, children }: FilterChoiceProps): ReactElement { return <button type="button" onClick={onClick} className={`block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#EDF3E8] ${active ? 'bg-[#DCE8D2] text-brand-dark' : 'text-brand-dark'}`}>{children}</button> }

interface AdventureCardProps { adventure: Adventure; saved: boolean; onToggleSaved: () => void }
function AdventureCard({ adventure, saved, onToggleSaved }: AdventureCardProps): ReactElement {
  const route = resourceRoutes[adventure.id] ?? (adventure.url ? { title: adventure.title, description: adventure.description, experienceTags: adventure.experienceTags ?? [], url: adventure.url, location: adventure.location ?? stateForAdventure(adventure) } : undefined)
  const title = route?.title ?? adventure.title
  const description = route?.description ?? adventure.description
  const experienceTags = (route?.experienceTags ?? adventure.experienceTags ?? []).slice(0, 1)
  const url = route?.url ?? 'https://www.twinkl.com.au/'
  const resourceState = stateForAdventure(adventure)
  const providerName = adventure.providerName ?? route?.providerName
  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_30px_-24px_rgba(63,81,54,0.45)] sm:rounded-3xl"><div className="relative aspect-[4/3] bg-cream"><Image src={adventure.image} alt="" fill className="object-cover" /><a href={url} target="_blank" rel="noreferrer" className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[0.75rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark">Visit site<ExternalLink className="size-3.5" aria-hidden /></a><button type="button" onClick={onToggleSaved} aria-label={saved ? `Remove ${title} from saved adventures` : `Save ${title}`} aria-pressed={saved} className="absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-muted"><Heart className={`size-4 ${saved ? 'fill-primary' : ''}`} /></button></div><div className="flex flex-1 flex-col p-2 sm:p-2.5"><h4 className="min-h-[2.5rem] line-clamp-2 font-display text-[1.05rem] font-bold leading-tight text-brand-dark">{title}</h4><p className="mt-1 flex min-w-0 items-center gap-1 text-[0.82rem] font-semibold leading-none text-primary"><MapPin className="size-3.5 shrink-0" aria-hidden /><span>{resourceState}</span>{providerName && <><span className="text-primary/55" aria-hidden>·</span><span className="truncate">{providerName}</span></>}</p><p className="mt-2 min-h-[2.75rem] line-clamp-2 text-[0.84rem] leading-relaxed text-muted-foreground">{description}</p><div className="mt-auto border-t border-border pt-3"><div className="flex flex-wrap gap-1.5">{experienceTags.map((tag) => <span key={tag} className="rounded-full bg-badge-yellow px-2.5 py-1 text-[0.68rem] font-semibold leading-snug text-badge-yellow-foreground">{tag}</span>)}</div></div></div></article>
}

interface PaginationProps { currentPage: number; totalPages: number; onChange: (page: number) => void }
function Pagination({ currentPage, totalPages, onChange }: PaginationProps): ReactElement { const pages = Array.from({ length: totalPages }, (_, index) => index + 1); return <nav className="mt-5 flex items-center justify-center gap-1.5" aria-label="Adventure pages"><PaginationButton label="Previous page" disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)}><ChevronLeft className="size-4" /></PaginationButton>{pages.map((page) => <button key={page} type="button" onClick={() => onChange(page)} aria-current={page === currentPage ? 'page' : undefined} className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${page === currentPage ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-transparent text-foreground/75 hover:border-border hover:bg-card hover:text-primary'}`}>{page}</button>)}<PaginationButton label="Next page" disabled={currentPage === totalPages} onClick={() => onChange(currentPage + 1)}><ChevronRight className="size-4" /></PaginationButton></nav> }

interface PaginationButtonProps { label: string; disabled: boolean; onClick: () => void; children: ReactElement }
function PaginationButton({ label, disabled, onClick, children }: PaginationButtonProps): ReactElement { return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">{children}</button> }
