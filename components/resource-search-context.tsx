'use client'

import { createContext, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import type { AgeStage, Setting } from '@/lib/resource-search'

export type HeroAgeFilter = 'Any age' | AgeStage
export type HeroGroupFilter = 'Any group size' | Setting
export type UserMode = 'parent' | 'educator'

interface HeroSearchState {
  query: string
  age: HeroAgeFilter
  group: HeroGroupFilter
}

interface ResourceSearchContextValue {
  activeSearch: HeroSearchState
  applyHeroSearch: (search: HeroSearchState) => void
  userMode: UserMode
  setUserMode: (mode: UserMode) => void
}

interface ResourceSearchProviderProps {
  children: ReactNode
}

const initialSearch: HeroSearchState = { query: '', age: 'Any age', group: 'Any group size' }
const ResourceSearchContext = createContext<ResourceSearchContextValue | null>(null)

export function ResourceSearchProvider({ children }: ResourceSearchProviderProps): ReactElement {
  const [activeSearch, setActiveSearch] = useState<HeroSearchState>(initialSearch)
  const [userMode, setUserMode] = useState<UserMode>('educator')
  const value = useMemo<ResourceSearchContextValue>(
    () => ({ activeSearch, applyHeroSearch: setActiveSearch, userMode, setUserMode }),
    [activeSearch, userMode],
  )
  return <ResourceSearchContext.Provider value={value}>{children}</ResourceSearchContext.Provider>
}

export function useResourceSearch(): ResourceSearchContextValue {
  const context = useContext(ResourceSearchContext)
  if (context === null) throw new Error('useResourceSearch must be used within ResourceSearchProvider')
  return context
}
