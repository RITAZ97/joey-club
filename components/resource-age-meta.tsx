import { Baby, School, UsersRound, type LucideIcon } from 'lucide-react'
import type { ReactElement } from 'react'
import { ageShortLabel, canonicalAgeStage } from '@/lib/resource-discovery'

interface ResourceAgeMetaProps {
  age: string
  compact?: boolean
}

export function ResourceAgeMeta({ age, compact = false }: ResourceAgeMetaProps): ReactElement {
  const canonicalAge = canonicalAgeStage(age)
  const Icon: LucideIcon = canonicalAge === 'All ages' ? UsersRound : canonicalAge.startsWith('1') ? Baby : School
  return <span className={`inline-flex items-center gap-1.5 font-display font-bold leading-tight text-brand-dark ${compact ? 'text-[0.76rem]' : 'text-[1rem]'}`}>
    <Icon className={`${compact ? 'size-4' : 'size-[1.15rem]'} shrink-0 text-primary`} strokeWidth={1.8} aria-hidden />
    {ageShortLabel(canonicalAge)}
  </span>
}
