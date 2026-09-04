'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'

export type SavedContentType = 'activity' | 'eylf' | 'theme'
export type SavedEnvironment = 'Indoor' | 'Outdoor' | 'Mixed'
export type SavedAgeGroup = 'Toddlers' | 'Pre-school' | 'Nursery'
export type EylfOutcome = 'Outcome 1' | 'Outcome 2' | 'Outcome 3' | 'Outcome 4' | 'Outcome 5'

export interface ActivityCard {
  id: string
  title: string
  description: string
  image?: string
  sourceUrl: string
  environment: SavedEnvironment
  ageGroup: SavedAgeGroup
  eylfOutcomes: EylfOutcome[]
  tags?: string[]
}

export interface SavedItem {
  id: string
  type: SavedContentType
  title: string
  description?: string
  image?: string
  sourceUrl?: string
  environment?: SavedEnvironment
  ageGroup?: SavedAgeGroup
  eylfOutcomes: EylfOutcome[]
  tags?: string[]
  savedAt: string
}

export interface UserSavedFolders {
  activities: SavedItem[]
  eylfOutcomes: SavedItem[]
  learningThemes: SavedItem[]
  custom: Record<string, SavedItem[]>
}

interface SavedItemsContextValue {
  folders: UserSavedFolders
  hydrated: boolean
  isFoldersOpen: boolean
  setFoldersOpen: (open: boolean) => void
  isActivitySaved: (id: string) => boolean
  isTagSaved: (type: 'eylf' | 'theme', id: string) => boolean
  toggleSaveActivity: (activity: ActivityCard) => void
  toggleSaveTag: (type: 'eylf' | 'theme', item: Omit<SavedItem, 'type' | 'savedAt'>) => void
  removeSavedItem: (item: SavedItem) => void
  createFolder: (name: string) => void
  toggleItemInFolder: (name: string, item: SavedItem) => void
  renameFolder: (name: string, nextName: string) => void
  deleteFolder: (name: string) => void
  pendingActivity: SavedItem | null
  assignPendingActivity: (folderName: string) => void
  dismissPendingActivity: () => void
  pendingUnsaveActivity: SavedItem | null
  confirmUnsaveActivity: () => void
  dismissUnsaveActivity: () => void
}

const STORAGE_KEY = 'joeyclub:saved-items:v1'
const DEFAULT_FOLDER = 'Default'
const emptyFolders: UserSavedFolders = { activities: [], eylfOutcomes: [], learningThemes: [], custom: { [DEFAULT_FOLDER]: [] } }
const SavedItemsContext = createContext<SavedItemsContextValue | null>(null)

function folderKey(type: SavedContentType): 'activities' | 'eylfOutcomes' | 'learningThemes' {
  return type === 'activity' ? 'activities' : type === 'eylf' ? 'eylfOutcomes' : 'learningThemes'
}

export function SavedItemsProvider({ children }: { children: ReactNode }): ReactElement {
  const [folders, setFolders] = useState<UserSavedFolders>(emptyFolders)
  const [hydrated, setHydrated] = useState(false)
  const [isFoldersOpen, setFoldersOpen] = useState(false)
  const [pendingActivity, setPendingActivity] = useState<SavedItem | null>(null)
  const [pendingUnsaveActivity, setPendingUnsaveActivity] = useState<SavedItem | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSavedFolders>
        setFolders({ ...emptyFolders, ...parsed, custom: { [DEFAULT_FOLDER]: [], ...(parsed.custom ?? {}) } })
      }
    } catch { /* storage is optional; UI remains usable */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(folders))
  }, [folders, hydrated])

  const isActivitySaved = useCallback((id: string) => folders.activities.some((item) => item.id === id), [folders.activities])
  const isTagSaved = useCallback((type: 'eylf' | 'theme', id: string) => folders[folderKey(type)].some((item) => item.id === id), [folders])
  const toggleSaveActivity = useCallback((activity: ActivityCard) => {
    const existing = folders.activities.find((item) => item.id === activity.id)
    if (existing) {
      setPendingUnsaveActivity(existing)
      return
    }
    const { id, title, description, image, sourceUrl, environment, ageGroup, eylfOutcomes, tags } = activity
    const savedItem: SavedItem = { id, type: 'activity', title, description, image, sourceUrl, environment, ageGroup, eylfOutcomes, tags, savedAt: new Date().toISOString() }
    setPendingActivity(savedItem)
    setFolders((current) => current.activities.some((item) => item.id === activity.id) ? current : { ...current, activities: [...current.activities, savedItem], custom: { ...current.custom, [DEFAULT_FOLDER]: [...(current.custom[DEFAULT_FOLDER] ?? []), savedItem] } })
  }, [folders.activities])
  const toggleSaveTag = useCallback((type: 'eylf' | 'theme', item: Omit<SavedItem, 'type' | 'savedAt'>) => {
    setFolders((current) => {
      const key = folderKey(type)
      const items = current[key]
      if (items.some((saved) => saved.id === item.id)) return { ...current, [key]: items.filter((saved) => saved.id !== item.id) }
      return { ...current, [key]: [...items, { ...item, type, savedAt: new Date().toISOString() }] }
    })
  }, [])
  const removeSavedItem = useCallback((item: SavedItem) => {
    const key = folderKey(item.type)
    setFolders((current) => ({ ...current, [key]: current[key].filter((saved) => saved.id !== item.id), custom: Object.fromEntries(Object.entries(current.custom).map(([name, saved]) => [name, saved.filter((saved) => saved.id !== item.id)])) }))
  }, [])
  const createFolder = useCallback((name: string) => {
    const cleanName = name.trim()
    if (!cleanName) return
    setFolders((current) => current.custom[cleanName] ? current : { ...current, custom: { ...current.custom, [cleanName]: [] } })
  }, [])
  const toggleItemInFolder = useCallback((name: string, item: SavedItem) => {
    setFolders((current) => {
      const existing = current.custom[name] ?? []
      const next = existing.some((saved) => saved.id === item.id) ? existing.filter((saved) => saved.id !== item.id) : [...existing, item]
      return { ...current, custom: { ...current.custom, [name]: next } }
    })
  }, [])
  const renameFolder = useCallback((name: string, nextName: string) => {
    const cleanName = nextName.trim()
    if (!cleanName || name === DEFAULT_FOLDER) return
    setFolders((current) => {
      const contents = current.custom[name]
      if (!contents || current.custom[cleanName]) return current
      const { [name]: _, ...rest } = current.custom
      return { ...current, custom: { ...rest, [cleanName]: contents } }
    })
  }, [])
  const deleteFolder = useCallback((name: string) => {
    if (name === DEFAULT_FOLDER) return
    setFolders((current) => { const { [name]: _, ...rest } = current.custom; return { ...current, custom: rest } })
  }, [])
  const assignPendingActivity = useCallback((folderName: string) => {
    if (!pendingActivity) return
    setFolders((current) => ({ ...current, custom: Object.fromEntries(Object.entries(current.custom).map(([name, saved]) => [name, name === folderName ? [...saved.filter((item) => item.id !== pendingActivity.id), pendingActivity] : saved.filter((item) => item.id !== pendingActivity.id)])) }))
    setPendingActivity(null)
  }, [pendingActivity])
  const dismissPendingActivity = useCallback(() => setPendingActivity(null), [])
  const confirmUnsaveActivity = useCallback(() => {
    if (!pendingUnsaveActivity) return
    setFolders((current) => ({ ...current, activities: current.activities.filter((item) => item.id !== pendingUnsaveActivity.id), custom: Object.fromEntries(Object.entries(current.custom).map(([name, saved]) => [name, saved.filter((item) => item.id !== pendingUnsaveActivity.id)])) }))
    setPendingUnsaveActivity(null)
  }, [pendingUnsaveActivity])
  const dismissUnsaveActivity = useCallback(() => setPendingUnsaveActivity(null), [])

  const value = useMemo(() => ({ folders, hydrated, isFoldersOpen, setFoldersOpen, isActivitySaved, isTagSaved, toggleSaveActivity, toggleSaveTag, removeSavedItem, createFolder, toggleItemInFolder, renameFolder, deleteFolder, pendingActivity, assignPendingActivity, dismissPendingActivity, pendingUnsaveActivity, confirmUnsaveActivity, dismissUnsaveActivity }), [folders, hydrated, isFoldersOpen, isActivitySaved, isTagSaved, toggleSaveActivity, toggleSaveTag, removeSavedItem, createFolder, toggleItemInFolder, renameFolder, deleteFolder, pendingActivity, assignPendingActivity, dismissPendingActivity, pendingUnsaveActivity, confirmUnsaveActivity, dismissUnsaveActivity])
  return <SavedItemsContext.Provider value={value}>{children}</SavedItemsContext.Provider>
}

export function useSavedItems(): SavedItemsContextValue {
  const context = useContext(SavedItemsContext)
  if (!context) throw new Error('useSavedItems must be used within SavedItemsProvider')
  return context
}
