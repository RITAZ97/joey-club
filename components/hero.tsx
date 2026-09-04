'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { Check, ChevronDown, Search, Shield } from 'lucide-react'
import { useResourceSearch, type HeroAgeFilter, type HeroGroupFilter } from '@/components/resource-search-context'

const ageOptions: HeroAgeFilter[] = ['Any age', '0 - 3 yrs (Babies & Toddlers)', '3 - 5 yrs (Kinders & Preschoolers)']
const groupOptions: HeroGroupFilter[] = ['Any group size', 'Individual (1-on-1)', 'Group']

export function Hero(): ReactElement {
  const { applyHeroSearch, userMode } = useResourceSearch()
  const [query, setQuery] = useState<string>('')
  const [age, setAge] = useState<HeroAgeFilter>('Any age')
  const [group, setGroup] = useState<HeroGroupFilter>('Any group size')

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    applyHeroSearch({ query, age, group })
    window.requestAnimationFrame(() => document.getElementById('early-years-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return <section className="mx-auto grid w-full items-center gap-5 px-5 pb-7 pt-5 sm:gap-7 sm:pt-7 lg:w-[95%] lg:max-w-[1400px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 lg:px-10 lg:pt-10">
    <div className="max-w-[41rem] max-lg:mx-auto max-lg:max-w-[41rem] max-lg:text-center">
      <h1 className="font-display text-[clamp(1.55rem,7.6vw,2rem)] font-bold leading-[1.04] tracking-[0.005em] [word-spacing:0.04em] text-foreground sm:text-[clamp(2rem,5vw,2.65rem)] lg:text-[3.25rem]">
        <span className="block lg:hidden">Nurturing curious minds,<br />safely and simply.</span>
        <span className="hidden lg:block">Nurturing curious<br />minds, safely and<br />simply.</span>
      </h1>
      <form onSubmit={submitSearch} className="mt-5 max-w-[34rem] rounded-2xl border border-border bg-card p-3.5 shadow-[0_24px_50px_-30px_rgba(63,81,54,0.4)] sm:mt-6 sm:p-4 max-lg:mx-auto max-lg:max-w-[41rem] lg:mt-8 lg:rounded-[28px] lg:p-5">
        <label className="flex items-center gap-3 rounded-lg border border-input bg-background px-3.5 py-2.5 lg:rounded-xl lg:px-4 lg:py-3.5"><Search className="size-4.5 shrink-0 text-muted-foreground lg:size-5" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search by keyword or topic" className="w-full bg-transparent text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <SearchSelect label="Age" value={age} options={ageOptions} onChange={(value) => setAge(value as HeroAgeFilter)} /><SearchSelect label="Group size" value={group} options={groupOptions} onChange={(value) => setGroup(value as HeroGroupFilter)} />
        </div>
        <button type="submit" className="mt-3 w-full rounded-lg bg-primary py-2.5 text-[0.9rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark lg:mt-3.5 lg:rounded-xl lg:py-3.5 lg:text-[1rem]">Search Safe Resources</button>
      </form>
      <div className="mt-6 flex items-start gap-3 max-lg:justify-center max-lg:text-left">
        <span className="relative flex size-8 shrink-0 items-center justify-center">
          <Shield className="size-8 fill-primary text-primary" aria-hidden />
          <Check className="absolute size-4 stroke-[3] text-primary-foreground" aria-hidden />
        </span>
        <p className="max-w-sm pt-0.5 text-[0.85rem] leading-snug text-muted-foreground max-lg:max-w-[30rem]">Searches strictly within 100% verified, children-friendly Australian ECEC whitelisted domains.</p>
      </div>
    </div>
    <div className="relative order-first mx-auto aspect-[316/210] w-[86%] max-w-[44rem] sm:w-[84%] lg:order-last lg:w-full lg:max-w-none">
      <Image
        src={userMode === 'parent' ? '/illustrations/hero-parent.png' : '/illustrations/hero-educator.png'}
        alt={userMode === 'parent' ? 'A family exploring learning ideas together on a tablet' : 'An educator reading and playing with young children'}
        fill
        sizes="(min-width: 1024px) 52vw, (min-width: 640px) 84vw, 86vw"
        className={`object-contain object-center ${userMode === 'educator' ? 'scale-x-[1.07]' : ''}`}
        priority
      />
    </div>
  </section>
}

interface SearchSelectProps { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }

function SearchSelect({ label, value, options, onChange }: SearchSelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const optionLabel = (option: string): string => option === 'Any age' || option === 'Any group size' ? label : option

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (event.target instanceof Node && rootRef.current !== null && !rootRef.current.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent): void => { if (event.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return <div ref={rootRef} className="relative"><button type="button" onClick={() => setIsOpen((current) => !current)} aria-label={label} aria-expanded={isOpen} aria-haspopup="listbox" className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-4 text-left text-[0.82rem] font-medium text-foreground transition-colors hover:border-primary sm:text-[0.9rem] lg:h-12 lg:rounded-xl lg:px-5 lg:text-[0.92rem]"><span className="truncate">{optionLabel(value)}</span><ChevronDown className={`mr-1 size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden /></button>{isOpen && <div role="listbox" aria-label={label} className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)] lg:rounded-xl">{options.map((option) => <button key={option} type="button" role="option" aria-selected={value === option} onClick={() => { onChange(option); setIsOpen(false) }} className={`block w-full rounded-md px-4 py-2.5 text-left text-[0.8rem] transition-colors hover:bg-[#EDF3E8] sm:text-[0.86rem] ${value === option ? 'bg-[#DCE8D2] font-semibold text-brand-dark' : 'text-brand-dark'}`}>{optionLabel(option)}</button>)}</div>}</div>
}
