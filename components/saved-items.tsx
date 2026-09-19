'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { useAuth } from '@/components/auth-context'

export type SavedContentType = 'activity' | 'eylf' | 'theme'
export type SavedEnvironment = 'Indoor' | 'Outdoor' | 'Mixed'
export type SavedAgeGroup = 'Toddlers' | 'Pre-school' | 'Nursery' | 'All ages'
export type EylfOutcome = 'Outcome 1' | 'Outcome 2' | 'Outcome 3' | 'Outcome 4' | 'Outcome 5'
export type SavedOrigin = 'joeyclub' | 'web' | 'created'

export interface SavedDocument {
  name: string
  dataUrl: string
}

/** Per file, and per card across all of its attached files (see /upload-policy). */
export const MAX_DOCUMENT_FILE_BYTES = 4 * 1024 * 1024
export const MAX_CARD_DOCUMENT_BYTES = 10 * 1024 * 1024

/** A base64 data URL is ~4/3 the size of the bytes it encodes. */
export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

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
  origin?: SavedOrigin
  sourceName?: string
  ageLabel?: string
  eylfDetail?: string
  location?: string
  activityType?: string
  topic?: string
  documents?: SavedDocument[]
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
  origin?: SavedOrigin
  sourceName?: string
  ageLabel?: string
  eylfDetail?: string
  location?: string
  activityType?: string
  topic?: string
  documents?: SavedDocument[]
  savedAt: string
}

/**
 * The canonical activity-type → cover image pairing used by the Early Years
 * Learning Explorer (see components/early-years-explorer.tsx). Keeping this
 * mapping here lets any saved-item card resolve the same official
 * illustration by type instead of guessing from free text.
 */
const ACTIVITY_TYPE_CARD_IMAGES: Record<string, string> = {
  'arts & crafts': '/cards/activity-arts-crafts.png',
  stem: '/cards/activity-stem-nature.png',
  'stem & nature': '/cards/activity-stem-nature.png',
  'music / video': '/cards/activity-music-video.png',
  'literacy & storytelling': '/cards/activity-stories-letters.png',
  'stories & letters': '/cards/activity-stories-letters.png',
  'sensory & messy play': '/cards/activity-sensory-messy.png',
  'outdoor & physical play': '/cards/activity-outdoor-physical.png',
}

export function activityTypeCardImage(activityType?: string | null): string | null {
  if (!activityType) return null
  return ACTIVITY_TYPE_CARD_IMAGES[activityType.trim().toLowerCase()] ?? null
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
  storageWarning: string | null
  dismissStorageWarning: () => void
  authPromptOpen: boolean
  dismissAuthPrompt: () => void
  isFoldersOpen: boolean
  setFoldersOpen: (open: boolean) => void
  isActivitySaved: (id: string) => boolean
  isTagSaved: (type: 'eylf' | 'theme', id: string) => boolean
  toggleSaveActivity: (activity: ActivityCard) => void
  addGeneratedActivity: (activity: ActivityCard, folderName?: string) => void
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
  const { user } = useAuth()
  const [folders, setFolders] = useState<UserSavedFolders>(emptyFolders)
  const [hydrated, setHydrated] = useState(false)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
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
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(folders))
      setStorageWarning(null)
    } catch {
      // Browser storage is full (attached files are the usual cause). The
      // in-memory state above still updated, so the UI stays responsive for
      // this session — it just won't survive a refresh until something is
      // removed to free up space.
      setStorageWarning("Your browser's storage is full, so this change won't be saved after you close the page. Remove an attached file or an old card to free up space.")
    }
  }, [folders, hydrated])
  const dismissStorageWarning = useCallback(() => setStorageWarning(null), [])
  const dismissAuthPrompt = useCallback(() => setAuthPromptOpen(false), [])

  const isActivitySaved = useCallback((id: string) => folders.activities.some((item) => item.id === id), [folders.activities])
  const isTagSaved = useCallback((type: 'eylf' | 'theme', id: string) => folders[folderKey(type)].some((item) => item.id === id), [folders])
  const toggleSaveActivity = useCallback((activity: ActivityCard) => {
    if (!user) { setAuthPromptOpen(true); return }
    const existing = folders.activities.find((item) => item.id === activity.id)
    if (existing) {
      setPendingUnsaveActivity(existing)
      return
    }
    const { id, title, description, image, sourceUrl, environment, ageGroup, eylfOutcomes, tags, origin, sourceName, ageLabel, eylfDetail, location, activityType, topic, documents } = activity
    const savedItem: SavedItem = { id, type: 'activity', title, description, image, sourceUrl, environment, ageGroup, eylfOutcomes, tags, origin, sourceName, ageLabel, eylfDetail, location, activityType, topic, documents, savedAt: new Date().toISOString() }
    setPendingActivity(savedItem)
    setFolders((current) => current.activities.some((item) => item.id === activity.id) ? current : { ...current, activities: [...current.activities, savedItem], custom: { ...current.custom, [DEFAULT_FOLDER]: [...(current.custom[DEFAULT_FOLDER] ?? []), savedItem] } })
  }, [folders.activities, user])
  const addGeneratedActivity = useCallback((activity: ActivityCard, folderName = DEFAULT_FOLDER) => {
    const savedItem: SavedItem = { ...activity, type: 'activity', savedAt: new Date().toISOString() }
    setFolders((current) => {
      const targetFolder = current.custom[folderName] ? folderName : DEFAULT_FOLDER
      const activities = [savedItem, ...current.activities.filter((item) => item.id !== savedItem.id)]
      const custom = Object.fromEntries(Object.entries(current.custom).map(([name, saved]) => [name, name === targetFolder ? [savedItem, ...saved.filter((item) => item.id !== savedItem.id)] : saved.filter((item) => item.id !== savedItem.id)]))
      return { ...current, activities, custom }
    })
  }, [])
  const toggleSaveTag = useCallback((type: 'eylf' | 'theme', item: Omit<SavedItem, 'type' | 'savedAt'>) => {
    if (!user) { setAuthPromptOpen(true); return }
    setFolders((current) => {
      const key = folderKey(type)
      const items = current[key]
      if (items.some((saved) => saved.id === item.id)) return { ...current, [key]: items.filter((saved) => saved.id !== item.id) }
      return { ...current, [key]: [...items, { ...item, type, savedAt: new Date().toISOString() }] }
    })
  }, [user])
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

  const value = useMemo(() => ({ folders, hydrated, storageWarning, dismissStorageWarning, authPromptOpen, dismissAuthPrompt, isFoldersOpen, setFoldersOpen, isActivitySaved, isTagSaved, toggleSaveActivity, addGeneratedActivity, toggleSaveTag, removeSavedItem, createFolder, toggleItemInFolder, renameFolder, deleteFolder, pendingActivity, assignPendingActivity, dismissPendingActivity, pendingUnsaveActivity, confirmUnsaveActivity, dismissUnsaveActivity }), [folders, hydrated, storageWarning, dismissStorageWarning, authPromptOpen, dismissAuthPrompt, isFoldersOpen, isActivitySaved, isTagSaved, toggleSaveActivity, addGeneratedActivity, toggleSaveTag, removeSavedItem, createFolder, toggleItemInFolder, renameFolder, deleteFolder, pendingActivity, assignPendingActivity, dismissPendingActivity, pendingUnsaveActivity, confirmUnsaveActivity, dismissUnsaveActivity])
  return <SavedItemsContext.Provider value={value}>{children}</SavedItemsContext.Provider>
}

export function useSavedItems(): SavedItemsContextValue {
  const context = useContext(SavedItemsContext)
  if (!context) throw new Error('useSavedItems must be used within SavedItemsProvider')
  return context
}
