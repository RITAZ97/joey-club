'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Heart, MapPin, Navigation } from 'lucide-react'
import { type UserMode, useResourceSearch } from '@/components/resource-search-context'
import { type ActivityCard, useSavedItems } from '@/components/saved-items'

type AdventureKind = 'incursion' | 'excursion' | 'indoor' | 'outdoor'

const states = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const
type StateCode = (typeof states)[number]
type Region = string
interface PostcodePlace { postcode: string; suburb: string; state: StateCode; region: string }
const regionsByState: Record<StateCode, readonly string[]> = {
  VIC: ['All Regions', 'Melbourne CBD & Inner City', 'Eastern Suburbs', 'Inner West & Greater West', 'North Shore & Northern Suburbs', 'Other — use postcode for a precise area'],
  NSW: ['All Regions', 'Sydney CBD & Inner City', 'Eastern Suburbs', 'Inner West & Greater West', 'Northern Beaches & North Shore', 'Other — use postcode for a precise area'],
  QLD: ['All Regions', 'Brisbane CBD & Inner City', 'Gold Coast', 'Sunshine Coast', 'Other — use postcode for a precise area'],
  SA: ['All Regions', 'Adelaide CBD & Inner Suburbs', 'Adelaide Hills', 'Other — use postcode for a precise area'],
  WA: ['All Regions', 'Perth CBD & Inner City', 'Fremantle & Western Suburbs', 'Other — use postcode for a precise area'],
  TAS: ['All Regions', 'Hobart & Greater South', 'Launceston & North', 'Other — use postcode for a precise area'],
  NT: ['All Regions', 'Darwin & Top End', 'Other — use postcode for a precise area'],
  ACT: ['All Regions', 'Canberra & Surrounds', 'Other — use postcode for precise location'],
}
const postcodePlaces: readonly PostcodePlace[] = [
  { postcode: '3000', suburb: 'Melbourne CBD', state: 'VIC', region: 'Melbourne CBD & Inner City' }, { postcode: '3101', suburb: 'Kew', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3122', suburb: 'Hawthorn', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3125', suburb: 'Burwood', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3130', suburb: 'Blackburn', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3138', suburb: 'Ringwood', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3149', suburb: 'Mount Waverley', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3150', suburb: 'Glen Waverley', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3189', suburb: 'Moorabbin', state: 'VIC', region: 'Eastern Suburbs' }, { postcode: '3564', suburb: 'Echuca', state: 'VIC', region: 'Other — use postcode for a precise area' },
  { postcode: '2000', suburb: 'Sydney CBD', state: 'NSW', region: 'Sydney CBD & Inner City' }, { postcode: '2150', suburb: 'Parramatta', state: 'NSW', region: 'Inner West & Greater West' },
  { postcode: '4000', suburb: 'Brisbane CBD', state: 'QLD', region: 'Brisbane CBD & Inner City' }, { postcode: '4217', suburb: 'Surfers Paradise', state: 'QLD', region: 'Gold Coast' },
  { postcode: '5000', suburb: 'Adelaide CBD', state: 'SA', region: 'Adelaide CBD & Inner Suburbs' }, { postcode: '6000', suburb: 'Perth CBD', state: 'WA', region: 'Perth CBD & Inner City' }, { postcode: '7000', suburb: 'Hobart CBD', state: 'TAS', region: 'Hobart & Greater South' }, { postcode: '0800', suburb: 'Darwin CBD', state: 'NT', region: 'Darwin & Top End' }, { postcode: '2600', suburb: 'Canberra', state: 'ACT', region: 'Canberra & Surrounds' },
] as const

interface Adventure {
  id: string
  title: string
  description: string
  image: string
  category: string
  tags: readonly string[]
  url?: string
  location?: string
}

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
      { id: 'sensory', title: 'Rainy Day Sensory Lab', description: 'A playful, hands-on lab for messy exploration and discovery.', image: '/cards/water-pouring.png', category: 'Art, Craft & Sensory', tags: ['Indoor Fun', 'Messy Play'] },
      { id: 'museum', title: 'Interactive Kids’ Science Museum', description: 'Touch, test and discover together in a child-friendly science space.', image: '/cards/bubble-science.png', category: 'Museums & Storytime', tags: ['Indoor', 'STEM'] },
      { id: 'pottery', title: 'Family Pottery Workshop', description: 'Create something special together in a relaxed creative studio.', image: '/cards/colour-sorting.png', category: 'Art, Craft & Sensory', tags: ['Indoor', 'Creative Arts'] },
      { id: 'storytime', title: 'Community Library Storytime', description: 'Enjoy stories, songs and rhymes in a welcoming reading nook.', image: '/cards/story-puppets.png', category: 'Museums & Storytime', tags: ['Indoor', 'Literacy'] },
      { id: 'soft-play', title: 'Soft Play Morning', description: 'A gentle active-play session for little movers and their grown-ups.', image: '/cards/animal-moves.png', category: 'Playcentres & Party Venues', tags: ['Indoor Fun', 'Family'] },
      { id: 'makers', title: 'Mini Makers Studio', description: 'Paint, print and build alongside local creative educators.', image: '/cards/dot-art.png', category: 'Art, Craft & Sensory', tags: ['Creative Arts', 'Family'] },
      { id: 'climbers', title: 'Little Climbers Club', description: 'Build confidence through safe, playful climbing challenges.', image: '/cards/shadow-shapes.png', category: 'Sports & Active', tags: ['Indoor', 'Wellbeing'] },
      { id: 'music', title: 'Family Music Club', description: 'Sing, move and play instruments in an inclusive group session.', image: '/cards/shake-rhyme.png', category: 'Other', tags: ['Music', 'Family'] },
    ],
  },
  {
    id: 'outdoor', title: 'Outdoor Activities & Outings', dropdownLabel: 'All Outdoor Types', allLabel: 'All Outdoor',
    categories: ['Parks & Playground Adventures', 'Farm & Animal Visits', 'Nature Walks & Trails', 'Community Gardens & Sustainability', 'Other'],
    adventures: [
      { id: 'scavenger', title: 'Nature Scavenger Hunt', description: 'Explore local parks while spotting leaves, bugs and hidden treasures.', image: '/cards/nature-treasure.png', category: 'Nature Walks & Trails', tags: ['Outdoor Exploration', 'Family'] },
      { id: 'garden', title: 'Community Veggie Garden Dig', description: 'Get your hands dirty and grow fresh vegetables together.', image: '/cards/little-gardeners.png', category: 'Community Gardens & Sustainability', tags: ['Sustainability', 'Family'] },
      { id: 'bike', title: 'Riverfront Bike Adventure', description: 'Enjoy a safe scenic ride beside the river with the whole family.', image: '/illustrations/nature-walk.png', category: 'Other', tags: ['Outdoor', 'Wellbeing'] },
      { id: 'sanctuary', title: 'Healesville Sanctuary Trip', description: 'Meet Australian animals and learn about the world they call home.', image: '/cards/animal-moves.png', category: 'Farm & Animal Visits', tags: ['Animals', 'Family'] },
      { id: 'playground', title: 'Water Play Park Day', description: 'Cool down with imaginative water play and a picnic together.', image: '/cards/water-pouring.png', category: 'Parks & Playground Adventures', tags: ['Outdoor', 'Family'] },
      { id: 'trail', title: 'Botanic Garden Trail', description: 'Follow a gentle family trail through plants, birds and big trees.', image: '/cards/nature-treasure.png', category: 'Nature Walks & Trails', tags: ['Nature', 'Family'] },
      { id: 'farm', title: 'Little Farm Morning', description: 'Feed friendly animals and discover where food comes from.', image: '/cards/little-gardeners.png', category: 'Farm & Animal Visits', tags: ['Animals', 'Outdoor'] },
      { id: 'fruit', title: 'Fruit Picking Day', description: 'Pick seasonal fruit and make a simple snack from the harvest.', image: '/cards/colour-sorting.png', category: 'Community Gardens & Sustainability', tags: ['Sustainability', 'Family'] },
    ],
  },
]

const educatorSections: readonly AdventureSection[] = [
  {
    id: 'incursion', title: 'Incursion', dropdownLabel: 'All Incursion Types', allLabel: 'All Incursions',
    categories: ['Animals & Nature', 'First Nations & Culture', 'Multicultural & Arts', 'STEM & Science', 'Performing Arts & Drama', 'Other'],
    adventures: [
      { id: 'reptile', title: 'Reptile Encounters Incursion', description: 'A safe, engaging animal encounter that brings nature close.', image: '/cards/animal-moves.png', category: 'Animals & Nature', tags: ['Incursion', 'EYLF Outcome 2'] },
      { id: 'rhythm', title: 'Aussie Rhythm Workshop', description: 'An interactive drumming circle for listening, teamwork and joy.', image: '/cards/shake-rhyme.png', category: 'Multicultural & Arts', tags: ['Incursion', 'Music & Dance'] },
      { id: 'bunggul', title: 'First Nations Bunggul Dance', description: 'A respectful cultural dance presentation celebrating Country and story.', image: '/cards/bush-tucker.png', category: 'First Nations & Culture', tags: ['Incursion', 'Culture'] },
      { id: 'science', title: 'Mad Scientist Lab Incursion', description: 'Safe, simple experiments that spark curiosity and wonder.', image: '/cards/bubble-science.png', category: 'STEM & Science', tags: ['Incursion', 'STEM'] },
      { id: 'puppet', title: 'Puppet Theatre Visit', description: 'A lively story performance with music, puppets and imagination.', image: '/cards/story-puppets.png', category: 'Performing Arts & Drama', tags: ['Incursion', 'Drama'] },
      { id: 'minibeast', title: 'Mini-beast Discovery', description: 'Observe small creatures and learn how to care for their habitats.', image: '/cards/nature-treasure.png', category: 'Animals & Nature', tags: ['Incursion', 'Nature'] },
      { id: 'yarning', title: 'Yarning Circle Stories', description: 'A guided, respectful storytelling experience for young learners.', image: '/cards/bush-tucker.png', category: 'First Nations & Culture', tags: ['Incursion', 'Culture'] },
      { id: 'planetarium', title: 'Little Planetarium Dome', description: 'Explore the night sky through an immersive learning visit.', image: '/cards/shadow-shapes.png', category: 'STEM & Science', tags: ['Incursion', 'Discovery'] },
    ],
  },
  {
    id: 'excursion', title: 'Excursion', dropdownLabel: 'All Excursion Types', allLabel: 'All Excursions',
    categories: ['Safety & Community Hubs', 'Animals & Wildlife', 'Parks & Bush Kinder', 'Museums & Discovery', 'Other'],
    adventures: [
      { id: 'fire', title: 'Local Fire Station Visit', description: 'Meet the crew and learn simple ways to stay safe together.', image: '/cards/colour-sorting.png', category: 'Safety & Community Hubs', tags: ['Excursion', 'Community Hubs'] },
      { id: 'traffic', title: 'Kew Traffic School Adventure', description: 'A practical road-safety session made for young children.', image: '/cards/shadow-shapes.png', category: 'Safety & Community Hubs', tags: ['Excursion', 'Road Safety'] },
      { id: 'children-farm', title: 'Children’s Farm Visit', description: 'Get up close with farm animals and explore nature in the city.', image: '/cards/little-gardeners.png', category: 'Animals & Wildlife', tags: ['Excursion', 'EYLF Outcome 2'] },
      { id: 'aquarium', title: 'Melbourne Aquarium Excursion', description: 'Discover marine life and learn how to care for our oceans.', image: '/cards/bubble-science.png', category: 'Animals & Wildlife', tags: ['Excursion', 'STEM'] },
      { id: 'museum-trip', title: 'Scienceworks Discovery Day', description: 'Explore playful exhibits that invite questions and experiments.', image: '/cards/bubble-science.png', category: 'Museums & Discovery', tags: ['Excursion', 'STEM'] },
      { id: 'gardens', title: 'Botanic Gardens Bush Kinder', description: 'Learn outdoors with guided nature play and sensory discovery.', image: '/illustrations/nature-walk.png', category: 'Parks & Bush Kinder', tags: ['Excursion', 'Nature'] },
      { id: 'library-trip', title: 'Library Discovery Visit', description: 'Explore stories, creative spaces and a child-friendly library tour.', image: '/cards/story-puppets.png', category: 'Museums & Discovery', tags: ['Excursion', 'Literacy'] },
      { id: 'park', title: 'Nature Reserve Walk', description: 'A guided walk for noticing animals, plants and changing seasons.', image: '/cards/nature-treasure.png', category: 'Parks & Bush Kinder', tags: ['Excursion', 'Outdoor'] },
    ],
  },
]

const pageSize = 4

interface SourceLinkedAdventureResource {
  id: string
  title: string
  description: string
  canonicalUrl: string
  activityType: string
  topic: string
  sourceName: string
}

const emptyDatabaseAdventures: Record<AdventureKind, Adventure[]> = { incursion: [], excursion: [], indoor: [], outdoor: [] }
const adventureKindFor=(activityType:string):AdventureKind|null=>{
  const value=activityType.toLowerCase()
  if(value.includes('incursion'))return 'incursion'
  if(value.includes('excursion'))return 'excursion'
  if(value.includes('indoor'))return 'indoor'
  if(value.includes('outdoor'))return 'outdoor'
  return null
}
const databaseAdventure=(resource:SourceLinkedAdventureResource):{kind:AdventureKind;adventure:Adventure}|null=>{
  const kind=adventureKindFor(resource.activityType)
  if(!kind)return null
  const category=kind==='excursion'&&/park|bush|nature|garden|outdoor/i.test(resource.title+' '+resource.description+' '+resource.topic)?'Parks & Bush Kinder':kind==='excursion'?'Other':kind==='incursion'?'Other':kind==='indoor'?'Other':'Other'
  const image=kind==='excursion'||kind==='outdoor'?'/cards/nature-treasure.png':kind==='incursion'?'/cards/bubble-science.png':'/cards/colour-sorting.png'
  return {kind,adventure:{id:'database-'+resource.id,title:resource.title,description:resource.description,image,category,tags:[resource.activityType,resource.topic],url:resource.canonicalUrl,location:resource.sourceName}}
}

interface ResourceRoute { title?: string; description?: string; tags?: readonly string[]; url: string; action: string; location: string; regionalRoutes?: Partial<Record<Region, { label: string; url: string }>> }
const resourceRoutes: Record<string, ResourceRoute> = {
  sensory: { title: 'Twisted Science STEM Playcentre', description: 'Hands-on interactive science playrooms, birthday parties and indoor discovery for young curious minds.', tags: ['Indoor', 'STEM Play', 'Ages 0–5'], url: 'https://www.twistedscience.com.au/', action: 'Visit site', location: 'Multiple Victorian locations', regionalRoutes: { 'Melbourne CBD & Inner City': { label: 'Twisted Science Moorabbin', url: 'https://www.twistedscience.com.au/about-us/accessibility/melbourne/' }, 'Eastern Suburbs': { label: 'Twisted Science Moorabbin', url: 'https://www.twistedscience.com.au/about-us/accessibility/melbourne/' }, 'Inner West & Greater West': { label: 'Twisted Science Moorabbin', url: 'https://www.twistedscience.com.au/about-us/accessibility/melbourne/' }, 'North Shore & Northern Suburbs': { label: 'Twisted Science Moorabbin', url: 'https://www.twistedscience.com.au/about-us/accessibility/melbourne/' }, 'Mornington Peninsula & Regional Vic': { label: 'Twisted Science Echuca', url: 'https://www.twistedscience.com.au/' } } },
  museum: { title: 'Melbourne Paint Lab Art Workshop', description: 'A guided hands-on art workshop for families who love to splash, paint and make.', tags: ['Indoor', 'Sensory Art', 'Family Fun'], url: 'https://whatson.melbourne.vic.gov.au/things-to-do/melbourne-paint-lab-art-workshop', action: 'View sessions', location: 'Melbourne CBD' },
  scavenger: { title: 'Collingwood Children’s Farm Outing', description: 'Meet farm animals, wander riverside paths and enjoy a gentle family day outdoors.', tags: ['Outdoor', 'Animal Interaction', 'Family'], url: 'https://www.farm.org.au/visit-us', action: 'Plan visit', location: 'Abbotsford, VIC' },
  garden: { title: 'Ian Potter Children’s Garden', description: 'Discover water play, plant tunnels and nature adventures made for young children.', tags: ['Outdoor', 'Nature Play', 'Family'], url: 'https://www.rbg.vic.gov.au/melbourne-gardens/discover-melbourne-gardens/melbourne-gardens-living-collections/the-ian-potter-foundation-childrens-garden/', action: 'Plan visit', location: 'Melbourne Gardens' },
  reptile: { title: 'Reptile Encounters Classroom Show', description: 'A safe, hands-on native wildlife experience designed for curious preschool learners.', tags: ['Incursion', 'EYLF Outcome 2.4', 'Wildlife'], url: 'https://www.reptileencounters.com.au/school-incursions', action: 'Book incursion', location: 'Victoria-wide service' },
  rhythm: { title: 'Little Sports Heroes Incursion', description: 'Playful movement games and confidence-building activities delivered at your early learning setting.', tags: ['Incursion', 'Wellbeing', 'Ages 0–5'], url: 'https://www.littleheroesaustralia.com/sports-victoria', action: 'Enquire now', location: 'Victoria-wide service' },
  fire: { title: 'Fire Rescue Victoria Station Visit', description: 'Connect with local fire safety learning, firefighter meet-and-greets and community events.', tags: ['Excursion', 'Community Hubs', 'Free booking'], url: 'https://www.frv.vic.gov.au/community-events', action: 'Find events', location: 'Victoria-wide' },
  traffic: { title: 'Kew Traffic School Road Safety', description: 'A miniature road layout for practising cycling and pedestrian safety with young children.', tags: ['Excursion', 'Road Safety', 'Risk planning'], url: 'https://www.boroondara.vic.gov.au/taxonomy/term/1776?page=6', action: 'View bookings', location: 'Kew, VIC' },
}

function stateForPostcode(value: string): StateCode | null {
  const postcode = Number(value.match(/\d{4}/)?.[0])
  if (!Number.isInteger(postcode)) return null
  if ((postcode >= 3000 && postcode <= 3999) || (postcode >= 8000 && postcode <= 8999)) return 'VIC'
  if ((postcode >= 200 && postcode <= 299) || (postcode >= 2600 && postcode <= 2618) || (postcode >= 2900 && postcode <= 2920)) return 'ACT'
  if ((postcode >= 1000 && postcode <= 2999) || (postcode >= 10000 && postcode <= 29999)) return 'NSW'
  if (postcode >= 4000 && postcode <= 4999) return 'QLD'
  if (postcode >= 5000 && postcode <= 5999) return 'SA'
  if (postcode >= 6000 && postcode <= 6999) return 'WA'
  if (postcode >= 7000 && postcode <= 7999) return 'TAS'
  if (postcode >= 800 && postcode <= 999) return 'NT'
  return null
}

function fallbackPostcodePlace(value: string): PostcodePlace | null {
  const postcode = value.match(/\d{4}/)?.[0]
  if (!postcode) return null
  const state = stateForPostcode(postcode)
  if (!state) return null
  return { postcode, suburb: `${state} postcode area`, state, region: regionsByState[state][0] }
}

function resolveRegion(value: string): Region {
  const text = value.trim().toLowerCase()
  if (!text) return 'All Regions'
  const match = postcodePlaces.find((place) => text.startsWith(place.postcode) || text.includes(place.suburb.toLowerCase()))
  if (match) return match.region
  const fallback = fallbackPostcodePlace(text)
  if (fallback) return fallback.region
  if (/(kew|box hill|ringwood|moorabbin|3138|3189)/.test(text)) return 'Eastern Suburbs'
  if (/(footscray|werribee|301[0-9]|302[0-9])/.test(text)) return 'Inner West & Greater West'
  if (/(preston|brunswick|305[0-9]|307[0-9])/.test(text)) return 'North Shore & Northern Suburbs'
  if (/(mornington|echuca|3[4-9][0-9]{2})/.test(text)) return 'Mornington Peninsula & Regional Vic'
  return 'Melbourne CBD & Inner City'
}

export function CommunityLearningAdventures(): ReactElement {
  const { userMode, setUserMode } = useResourceSearch()
  const { isActivitySaved, toggleSaveActivity } = useSavedItems()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [pages, setPages] = useState<Record<string, number>>({})
  const [openFilter, setOpenFilter] = useState<AdventureKind | null>(null)
  const [stateCode, setStateCode] = useState<StateCode>('VIC')
  const [region, setRegion] = useState<Region>('All Regions')
  const [openRegion, setOpenRegion] = useState(false)
  const [databaseAdventures,setDatabaseAdventures]=useState<Record<AdventureKind,Adventure[]>>(emptyDatabaseAdventures)
  useEffect(()=>{let isCurrent=true;void fetch('/api/resources?limit=50').then(async response=>{if(!response.ok)throw new Error('Unable to load database adventures.');return response.json() as Promise<{data:SourceLinkedAdventureResource[]}>}).then(response=>{if(!isCurrent)return;const next:Record<AdventureKind,Adventure[]>={incursion:[],excursion:[],indoor:[],outdoor:[]};response.data.forEach(resource=>{const converted=databaseAdventure(resource);if(converted)next[converted.kind].push(converted.adventure)});setDatabaseAdventures(next)}).catch(()=>{if(isCurrent)setDatabaseAdventures(emptyDatabaseAdventures)});return()=>{isCurrent=false}},[])
  const sections = (userMode === 'parent' ? parentSections : educatorSections).map((section)=>({...section,adventures:[...databaseAdventures[section.id],...section.adventures]}))
  const selectedRegion = region

  const setMode = (mode: UserMode): void => {
    setUserMode(mode)
    setOpenFilter(null)
  }

  return <section id="community-adventures" className="mx-auto w-full scroll-mt-6 px-5 py-10 sm:py-12 lg:w-[95%] lg:max-w-[1400px] lg:px-10 lg:py-14">
    <header>
      <h2 className="font-display text-[clamp(1.85rem,7vw,2.4rem)] font-bold leading-tight tracking-tight text-brand-dark">Community &amp; Learning Adventures</h2>
      <p className="mt-2 max-w-xl text-[0.95rem] text-muted-foreground sm:text-[1.05rem]">{userMode === 'parent' ? 'Curated places to play, create and explore together.' : 'Curated incursions and excursions for early learning groups.'}</p>
    </header>
    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
      <div className="flex w-full shrink-0 rounded-full border border-border bg-card p-1 shadow-sm sm:w-[31rem] lg:w-[28rem]"><ModeButton active={userMode === 'parent'} onClick={() => setMode('parent')}>For Parents</ModeButton><ModeButton active={userMode === 'educator'} onClick={() => setMode('educator')}>For Educators</ModeButton></div>
      <LocationFilterBar stateCode={stateCode} onStateChange={(state) => { setStateCode(state); setRegion('All Regions'); setOpenRegion(false) }} region={region} onRegionChange={setRegion} openRegion={openRegion} onToggleRegion={() => setOpenRegion((open) => !open)} />
    </div>
    <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">Showing resources for <span className="font-semibold text-brand-dark">{selectedRegion}</span></p>
    <div className="mt-8 space-y-10 lg:mt-10 lg:space-y-12">
      {sections.map((section) => <AdventureCollection key={section.id} section={section} filter={filters[section.id] ?? section.allLabel} page={pages[section.id] ?? 1} isFilterOpen={openFilter === section.id} onToggleFilter={() => setOpenFilter((current) => current === section.id ? null : section.id)} onFilterChange={(value) => { setFilters((current) => ({ ...current, [section.id]: value })); setPages((current) => ({ ...current, [section.id]: 1 })); setOpenFilter(null) }} onPageChange={(page) => setPages((current) => ({ ...current, [section.id]: page }))} selectedRegion={selectedRegion} stateCode={stateCode} isActivitySaved={isActivitySaved} onToggleSaved={(adventure) => toggleSaveActivity(toAdventureActivity(adventure, section.id))} />)}
    </div>
  </section>
}

interface ModeButtonProps { active: boolean; onClick: () => void; children: string }
function ModeButton({ active, onClick, children }: ModeButtonProps): ReactElement { return <button type="button" onClick={onClick} className={`flex-1 rounded-full px-3 py-2 text-sm font-bold transition-colors sm:px-5 sm:text-base ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/80 hover:text-primary'}`}>{children}</button> }

interface LocationFilterBarProps { stateCode: StateCode; onStateChange: (state: StateCode) => void; region: Region; onRegionChange: (region: Region) => void; openRegion: boolean; onToggleRegion: () => void }
function LocationFilterBar({ stateCode, onStateChange, region, onRegionChange, openRegion, onToggleRegion }: LocationFilterBarProps): ReactElement {
  const [openState, setOpenState] = useState(false)
  const toggleState = (): void => {
    if (!openState && openRegion) onToggleRegion()
    setOpenState((open) => !open)
  }
  const toggleRegion = (): void => {
    setOpenState(false)
    onToggleRegion()
  }

  return <div className="w-full rounded-xl border border-border bg-card p-4 shadow-[0_14px_30px_-24px_rgba(63,81,54,0.45)] lg:w-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"><div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:items-center lg:gap-5"><div className="min-w-0 text-left lg:flex lg:flex-none lg:items-center lg:gap-2"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-dark lg:mb-0">State</span><div className="relative min-w-0 lg:w-[7.5rem]"><button type="button" onClick={toggleState} aria-label="Select state" aria-expanded={openState} className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-primary bg-card px-4 py-2.5 text-left text-sm font-semibold text-foreground"><span>{stateCode}</span><ChevronDown className={`size-4 shrink-0 text-primary transition-transform ${openState ? 'rotate-180' : ''}`} /></button>{openState && <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{states.map((state) => <FilterChoice key={state} active={stateCode === state} onClick={() => { onStateChange(state); setOpenState(false) }}>{state}</FilterChoice>)}</div>}</div></div><div className="min-w-0 flex-1 lg:flex lg:flex-none lg:items-center lg:gap-2"><span className="mb-1.5 block text-left text-xs font-bold uppercase tracking-wide text-brand-dark lg:mb-0">Region</span><div className="relative min-w-0 flex-1 lg:w-[clamp(16rem,22vw,24rem)] lg:flex-none"><button type="button" onClick={toggleRegion} aria-expanded={openRegion} className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-primary bg-card px-4 py-2.5 text-left text-sm font-semibold text-foreground"><span className="inline-flex min-w-0 items-center gap-2 truncate"><Navigation className="size-4 shrink-0 text-primary" aria-hidden />{region}</span><ChevronDown className={`size-4 shrink-0 transition-transform ${openRegion ? 'rotate-180' : ''}`} /></button>{openRegion && <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{regionsByState[stateCode].map((option) => <FilterChoice key={option} active={region === option} onClick={() => { onRegionChange(option); onToggleRegion() }}>{option}</FilterChoice>)}</div>}</div></div></div></div>
}

function FilterModeButton({ active, onClick, children }: ModeButtonProps): ReactElement { return <button type="button" onClick={onClick} className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/75 hover:text-primary'}`}>{children}</button> }

function toAdventureActivity(adventure: Adventure, section: AdventureKind): ActivityCard {
  const outcome = adventure.tags.find((tag) => /EYLF Outcome [1-5]/.test(tag))?.match(/Outcome [1-5]/)?.[0]
  return { id: `adventure-${adventure.id}`, title: adventure.title, description: adventure.description, image: adventure.image, sourceUrl: resourceRoutes[adventure.id]?.url ?? 'https://www.twinkl.com.au/', environment: section === 'outdoor' || section === 'excursion' ? 'Outdoor' : 'Indoor', ageGroup: 'Pre-school', eylfOutcomes: outcome ? [outcome as ActivityCard['eylfOutcomes'][number]] : [], tags: [...adventure.tags] }
}

interface AdventureCollectionProps { section: AdventureSection; filter: string; page: number; isFilterOpen: boolean; onToggleFilter: () => void; onFilterChange: (value: string) => void; onPageChange: (page: number) => void; selectedRegion: Region; stateCode: StateCode; isActivitySaved: (id: string) => boolean; onToggleSaved: (adventure: Adventure) => void }
function AdventureCollection({ section, filter, page, isFilterOpen, onToggleFilter, onFilterChange, onPageChange, selectedRegion, stateCode, isActivitySaved, onToggleSaved }: AdventureCollectionProps): ReactElement {
  const filtered = useMemo(() => filter === section.allLabel ? section.adventures : section.adventures.filter((adventure) => adventure.category === filter), [filter, section])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activePage = Math.min(page, totalPages)
  const visible = filtered.slice((activePage - 1) * pageSize, activePage * pageSize)
  return <section aria-labelledby={`${section.id}-title`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><h3 id={`${section.id}-title`} className="font-display text-[clamp(1.45rem,6vw,2rem)] font-bold text-brand-dark">{section.title}</h3><div className="hidden h-px flex-1 bg-primary/75 sm:block" /><div className="relative self-start"><button type="button" onClick={onToggleFilter} aria-expanded={isFilterOpen} className="inline-flex min-w-[15rem] items-center justify-between gap-3 rounded-lg border border-primary bg-card px-4 py-2.5 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"><span>Category: {filter === section.allLabel ? section.dropdownLabel : filter}</span><ChevronDown className={`mr-1 size-4 shrink-0 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} /></button>{isFilterOpen && <div className="absolute left-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]"><FilterChoice active={filter === section.allLabel} onClick={() => onFilterChange(section.allLabel)}>{section.allLabel}</FilterChoice>{section.categories.map((category) => <FilterChoice key={category} active={filter === category} onClick={() => onFilterChange(category)}>{category}</FilterChoice>)}</div>}</div></div>
    <div className="mt-5 lg:mt-6"><div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">{visible.map((adventure) => <AdventureCard key={adventure.id} adventure={adventure} selectedRegion={selectedRegion} stateCode={stateCode} saved={isActivitySaved(`adventure-${adventure.id}`)} onToggleSaved={() => onToggleSaved(adventure)} />)}</div></div>
    <Pagination currentPage={activePage} totalPages={totalPages} onChange={onPageChange} />
  </section>
}

interface FilterChoiceProps { active: boolean; onClick: () => void; children: string }
function FilterChoice({ active, onClick, children }: FilterChoiceProps): ReactElement { return <button type="button" onClick={onClick} className={`block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#EDF3E8] ${active ? 'bg-[#DCE8D2] text-brand-dark' : 'text-brand-dark'}`}>{children}</button> }

interface AdventureCardProps { adventure: Adventure; selectedRegion: Region; stateCode: StateCode; saved: boolean; onToggleSaved: () => void }
function AdventureCard({ adventure, selectedRegion, stateCode, saved, onToggleSaved }: AdventureCardProps): ReactElement {
  const route = resourceRoutes[adventure.id] ?? (adventure.url ? { title: adventure.title, description: adventure.description, tags: adventure.tags, url: adventure.url, action: 'Visit site', location: adventure.location ?? stateCode } : undefined)
  const locationRoute = route?.regionalRoutes?.[selectedRegion]
  const title = route?.title ?? adventure.title
  const description = route?.description ?? adventure.description
  const tags = route?.tags ?? adventure.tags
  const url = locationRoute?.url ?? route?.url ?? 'https://www.twinkl.com.au/'
  const action = route?.action ?? 'Visit site'
  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_30px_-24px_rgba(63,81,54,0.45)] sm:rounded-3xl"><div className="relative aspect-[4/3] bg-cream"><Image src={adventure.image} alt="" fill className="object-cover" /><a href={url} target="_blank" rel="noreferrer" className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[0.75rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark">{action}<ExternalLink className="size-3.5" aria-hidden /></a><button type="button" onClick={onToggleSaved} aria-label={saved ? `Remove ${title} from saved adventures` : `Save ${title}`} aria-pressed={saved} className={`absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-muted`}><Heart className={`size-4 ${saved ? 'fill-primary' : ''}`} /></button></div><div className="flex flex-1 flex-col p-2 sm:p-2.5"><h4 className="min-h-[2.5rem] line-clamp-2 font-display text-[1.05rem] font-bold leading-tight text-brand-dark">{title}</h4><p className="mt-1 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-primary"><MapPin className="size-3.5" aria-hidden />{route?.location ?? stateCode}</p><p className="mt-2 min-h-[2.75rem] line-clamp-2 text-[0.84rem] leading-relaxed text-muted-foreground">{description}</p><div className="mt-3 overflow-hidden border-t border-border pt-3"><div className="flex flex-nowrap gap-1.5">{tags.slice(0, 3).map((tag, index) => <span key={tag} className={`min-w-0 truncate whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-semibold leading-snug ${index === 0 ? 'bg-badge-green text-badge-green-foreground' : index === 1 ? 'bg-badge-yellow text-badge-yellow-foreground' : 'bg-[#F2C2B4] text-[#7b473e]'}`}>{tag}</span>)}</div></div></div></article>
}

interface PaginationProps { currentPage: number; totalPages: number; onChange: (page: number) => void }
function Pagination({ currentPage, totalPages, onChange }: PaginationProps): ReactElement { const pages = Array.from({ length: totalPages }, (_, index) => index + 1); return <nav className="mt-5 flex items-center justify-center gap-1.5" aria-label="Adventure pages"><PaginationButton label="Previous page" disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)}><ChevronLeft className="size-4" /></PaginationButton>{pages.map((page) => <button key={page} type="button" onClick={() => onChange(page)} aria-current={page === currentPage ? 'page' : undefined} className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${page === currentPage ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-transparent text-foreground/75 hover:border-border hover:bg-card hover:text-primary'}`}>{page}</button>)}<PaginationButton label="Next page" disabled={currentPage === totalPages} onClick={() => onChange(currentPage + 1)}><ChevronRight className="size-4" /></PaginationButton></nav> }

interface PaginationButtonProps { label: string; disabled: boolean; onClick: () => void; children: ReactElement }
function PaginationButton({ label, disabled, onClick, children }: PaginationButtonProps): ReactElement { return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">{children}</button> }
