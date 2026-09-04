'use client'

import Image from 'next/image'
import { useState, type ReactElement } from 'react'
import { Baby, ExternalLink, Heart, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { RESOURCE_SOURCE_WHITELIST, SEARCH_RESOURCES, type SearchResource } from '@/lib/resource-search'
import { type ActivityCard, useSavedItems } from '@/components/saved-items'

const safeIdeaResourceIds = [
  'twinkl-identity-mind-map',
  'stemeez-sandcastle',
  'twinkl-parachute-wellbeing',
  'tpt-fine-motor-activities',
  'twinkl-communication-tips-4-5',
  'twinkl-garden-centre-role-play',
  'stemeez-digging-sand',
  'twinkl-science-week-crafts',
  'teachstarter-pre-k-craft',
] as const

const resourcesById = new Map(SEARCH_RESOURCES.map((resource) => [resource.id, resource]))
const safeIdeas = safeIdeaResourceIds
  .map((resourceId) => resourcesById.get(resourceId))
  .filter((resource): resource is SearchResource => resource !== undefined)
const ideaGroups: SearchResource[][] = [safeIdeas.slice(0, 3), safeIdeas.slice(3, 6), safeIdeas.slice(6, 9)]

export function SafeIdeas(): ReactElement {
  const { isActivitySaved, toggleSaveActivity } = useSavedItems()
  const [groupIndex, setGroupIndex] = useState<number>(0)
  const visibleIdeas = ideaGroups[groupIndex] ?? []

  const showNextIdeas = (): void => {
    setGroupIndex((currentIndex) => (currentIndex + 1) % ideaGroups.length)
  }

  return (
    <section id="safe-ideas" className="mx-auto w-full scroll-mt-6 px-5 py-8 sm:py-10 lg:w-[95%] lg:max-w-[1400px] lg:px-10">
      <h2 className="font-display text-[clamp(1.7rem,3vw,2rem)] font-bold tracking-tight text-brand-dark">
        Safe ideas for today
      </h2>

      <div className="mt-5 xl:flex xl:items-stretch xl:gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:flex-1 xl:grid-cols-3 xl:gap-5">
          {visibleIdeas.map((idea) => (
            <IdeaCard key={idea.title} idea={idea} saved={isActivitySaved(`resource-${idea.id}`)} onToggle={() => toggleSaveActivity(toSavedActivity(idea))} />
          ))}
          <button type="button" onClick={showNextIdeas} className="hidden min-h-48 items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 px-4 text-base font-semibold text-primary transition-colors hover:bg-muted sm:flex xl:hidden"><RefreshCw className="size-5" aria-hidden />Show more ideas</button>
        </div>
        <button
          type="button"
          onClick={showNextIdeas}
          aria-label="Show another group of safe ideas"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted sm:hidden xl:mt-0 xl:inline-flex xl:size-12 xl:self-center xl:justify-center xl:rounded-full xl:px-0 xl:hover:rotate-90"
        >
          <RefreshCw className="size-4 xl:size-5" aria-hidden />
          <span className="xl:hidden">Show more ideas</span>
        </button>
      </div>
    </section>
  )
}

interface IdeaCardProps {
  idea: SearchResource
  saved: boolean
  onToggle: () => void
}

function toSavedActivity(idea: SearchResource): ActivityCard {
  const match = idea.eylfOutcome?.match(/^Outcome\s+(\d)/)?.[1]
  return { id: `resource-${idea.id}`, title: idea.title, description: idea.description, image: idea.image, sourceUrl: idea.sourceUrl, environment: /outdoor|physical|nature/i.test(`${idea.activityType} ${idea.topic}`) ? 'Outdoor' : 'Indoor', ageGroup: idea.ages === '0-3' ? 'Toddlers' : 'Pre-school', eylfOutcomes: match ? [`Outcome ${match}` as ActivityCard['eylfOutcomes'][number]] : [], tags: [idea.activityType, idea.topic] }
}

function IdeaCard({ idea, saved, onToggle }: IdeaCardProps): ReactElement {
  const source = RESOURCE_SOURCE_WHITELIST[idea.source]
  const outcomeLabel = idea.eylfOutcome === undefined ? undefined : shortOutcome(idea.eylfOutcome)

  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[0_16px_36px_-28px_rgba(63,81,54,0.4)] sm:rounded-3xl sm:p-5 xl:flex xl:flex-col xl:px-4 xl:py-[21px]">
      <div className="grid shrink-0 grid-cols-[2fr_3fr] items-start gap-3 sm:gap-4 xl:gap-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream sm:rounded-2xl">
          <Image src={idea.image} alt="" fill className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-col items-start justify-start xl:h-full">
          <h3 title={idea.title} className="w-full line-clamp-3 font-display text-[1rem] font-bold leading-tight text-brand-dark sm:text-[1.08rem] xl:line-clamp-2">
            {idea.title}
          </h3>
          <div className="mt-1 hidden w-full flex-wrap items-start gap-1 xl:flex">
            <span className="inline-flex max-w-full items-center rounded-full bg-badge-green px-2 py-1 text-[0.64rem] font-semibold text-badge-green-foreground sm:px-2.5 sm:text-[0.68rem]"><span className="truncate">{idea.activityType}</span></span>
            {outcomeLabel !== undefined && <span className="inline-flex max-w-full items-center rounded-full bg-badge-yellow px-2 py-1 text-[0.64rem] font-semibold text-badge-yellow-foreground sm:px-2.5 sm:text-[0.68rem]"><span className="truncate">{outcomeLabel}</span></span>}
          </div>
        </div>
      </div>

      <p className="mt-3 h-[3rem] shrink-0 overflow-hidden text-[0.84rem] leading-relaxed text-muted-foreground line-clamp-2 sm:mt-4 sm:text-[0.9rem] xl:mt-2 xl:h-9 xl:text-[0.76rem]">
        {idea.description}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 xl:hidden">
        <span className="inline-flex rounded-full bg-badge-green px-2.5 py-1 text-[0.7rem] font-semibold text-badge-green-foreground">{idea.activityType}</span>
        {idea.eylfOutcome !== undefined && <span className="inline-flex rounded-full bg-badge-yellow px-2.5 py-1 text-[0.7rem] font-semibold text-badge-yellow-foreground">{shortOutcome(idea.eylfOutcome)}</span>}
      </div>

      <div className="mt-2.5 flex min-w-0 shrink-0 items-center gap-3 xl:mt-4">
        <a
          href={idea.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2.5 px-1.5 text-[0.86rem] font-bold text-primary underline decoration-1 underline-offset-4 transition-colors hover:text-brand-dark xl:h-8 xl:min-h-0 xl:rounded-full xl:bg-primary xl:px-3 xl:text-[0.78rem] xl:!text-[#fbfcf8] xl:no-underline xl:hover:bg-brand-dark xl:hover:!text-[#fbfcf8]"
        >
          Visit site
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <a href={idea.sourceUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-[0.82rem] font-medium text-muted-foreground transition-colors hover:text-primary">
          {source.name}
        </a>
        <button type="button" onClick={onToggle} aria-label={saved ? 'Unsave activity' : 'Save activity'} aria-pressed={saved} className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-primary hover:bg-muted"><Heart className={`size-4 ${saved ? 'fill-primary' : ''}`} /></button>
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-[.85fr_.9fr_1.25fr] gap-1 border-t border-border pt-2 text-[0.74rem] font-semibold text-foreground/80 sm:gap-1.5 sm:text-[0.8rem] xl:grid-cols-3 xl:gap-1.5 xl:text-[0.68rem]">
        <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 py-1 text-center xl:border xl:border-border xl:px-1.5">
          <Baby className="size-4 text-muted-foreground xl:size-3.5" aria-hidden />
          {idea.ages} yrs
        </span>
        <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 py-1 text-center xl:border xl:border-border xl:px-1.5">
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          {settingLabel(idea.setting)}
        </span>
        <span className="inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 py-1 text-center xl:gap-1.5 xl:border xl:border-border xl:px-1.5">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
          Source-linked
        </span>
      </div>
    </article>
  )
}

function settingLabel(setting: SearchResource['setting']): string {
  return setting === 'Individual (1-on-1)' ? 'Individual' : 'Group'
}

function shortOutcome(outcome: string): string {
  const outcomeNumber = outcome.match(/^Outcome\s+(\d+)/)?.[1]
  return outcomeNumber === undefined ? outcome : `EYLF Outcome ${outcomeNumber}`
}
