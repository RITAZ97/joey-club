'use client'

import Image from 'next/image'
import { Baby, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FilePenLine, FileText, Link2, LoaderCircle, MapPin, Pencil, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Trash2, Upload, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { activityTypeCardImage, estimateDataUrlBytes, MAX_CARD_DOCUMENT_BYTES, MAX_DOCUMENT_FILE_BYTES, type ActivityCard, type EylfOutcome, type SavedAgeGroup, type SavedDocument, type SavedItem, type SavedOrigin, useSavedItems } from '@/components/saved-items'
import { AuthModal } from '@/components/auth-modal'
import { useAuth } from '@/components/auth-context'
import { RESOURCE_SOURCE_WHITELIST } from '@/lib/resource-search'

type FolderTab = 'ideas' | 'outings'
type FolderAction = 'create' | 'rename' | 'delete' | null
type SourceFilter = 'all' | SavedOrigin

const ACTIVITY_TYPE_OPTIONS = ['Arts & Crafts', 'STEM & Nature', 'Music / Video', 'Stories & Letters', 'Sensory & Messy Play', 'Outdoor & Physical Play']
const TOPIC_OPTIONS = ['Animal Encounters', 'Nature & Sustainability', 'First Nations Perspectives', 'STEM & Discovery', 'Language & Literacy', 'Arts, Music & Creativity', 'Movement & Wellbeing', 'Sensory & Hands-on', 'Social Skills & Teamwork', 'Community & Life Skills']
const tabs: Array<{ id: FolderTab; label: string }> = [{ id: 'ideas', label: 'Saved Early Learning Ideas' }, { id: 'outings', label: 'Saved Outings & Venues' }]
const ages = ['All Ages', '1–3 yrs', '3–5 yrs']
const outcomes = ['All Outcomes', 'Outcome 1 (Identity)', 'Outcome 2 (Community)', 'Outcome 3 (Wellbeing)', 'Outcome 4 (Learning)', 'Outcome 5 (Communication)']
const settings = ['All Settings', 'Indoor', 'Outdoor', 'Mixed']
const states = ['All States', 'Victoria (VIC)', 'New South Wales (NSW)', 'Queensland (QLD)', 'Western Australia (WA)', 'Other']

export function MyFolders(): ReactElement {
  const { folders, removeSavedItem, addGeneratedActivity, createFolder, renameFolder, deleteFolder, storageWarning, dismissStorageWarning } = useSavedItems()
  const [tab, setTab] = useState<FolderTab>('ideas')
  const [setting, setSetting] = useState(settings[0])
  const [state, setState] = useState(states[0])
  const [age, setAge] = useState(ages[0])
  const [outcome, setOutcome] = useState(outcomes[0])
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [folder, setFolder] = useState('__all__')
  const [action, setAction] = useState<FolderAction>(null)
  const [folderName, setFolderName] = useState('')
  const [unsaveItem, setUnsaveItem] = useState<SavedItem | null>(null)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [editItem, setEditItem] = useState<SavedItem | null>(null)
  const [docsItem, setDocsItem] = useState<SavedItem | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => { if (folder !== '__all__' && !folders.custom[folder]) setFolder('__all__') }, [folder, folders.custom])
  useEffect(() => setPage(1), [tab, setting, state, age, outcome, query, source, folder])

  const allLabel = tab === 'ideas' ? 'All ideas' : 'All outings'
  const selected = folder === '__all__' ? folders.activities : (folders.custom[folder] ?? [])
  const tabItems = selected.filter((item) => isOuting(item) === (tab === 'outings'))
  const items = useMemo(() => tabItems.filter((item) => matchesFilters(item, { tab, setting, state, age, outcome, query, source })), [tabItems, tab, setting, state, age, outcome, query, source])
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const visible = items.slice((page - 1) * pageSize, page * pageSize)

  const changeTab = (next: FolderTab): void => {
    setTab(next); setSetting(settings[0]); setState(states[0]); setAge(ages[0]); setOutcome(outcomes[0]); setQuery(''); setPage(1)
  }
  const resetView = (): void => {
    setFolder('__all__'); setSetting(settings[0]); setState(states[0]); setAge(ages[0]); setOutcome(outcomes[0]); setQuery(''); setSource('all'); setPage(1)
  }
  const openAction = (next: Exclude<FolderAction, null>): void => { setFolderName(next === 'rename' ? folder : ''); setAction(next) }
  const confirmAction = (): void => {
    const name = folderName.trim()
    if (action === 'create' && name) { createFolder(name); setFolder(name) }
    if (action === 'rename' && name && folder !== 'Default' && folder !== '__all__') { renameFolder(folder, name); setFolder(name) }
    if (action === 'delete' && folder !== 'Default' && folder !== '__all__') { deleteFolder(folder); setFolder('__all__') }
    setAction(null)
  }
  const folderForItem = (item: SavedItem): string => Object.keys(folders.custom).find((name) => folders.custom[name]?.some((saved) => saved.id === item.id)) ?? 'Default'
  const saveDocumentsForItem = (item: SavedItem, documents: SavedDocument[]): void => {
    const activity: ActivityCard = {
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      image: item.image,
      sourceUrl: item.sourceUrl ?? '',
      environment: item.environment ?? 'Indoor',
      ageGroup: item.ageGroup ?? 'All ages',
      eylfOutcomes: item.eylfOutcomes,
      tags: item.tags,
      origin: item.origin,
      sourceName: item.sourceName,
      ageLabel: item.ageLabel,
      eylfDetail: item.eylfDetail,
      location: item.location,
      activityType: item.activityType,
      topic: item.topic,
      documents,
    }
    addGeneratedActivity(activity, folderForItem(item))
  }

  return <main className="fixed inset-0 z-[80] overflow-y-auto bg-background">
    <a href="/" className="fixed right-5 top-5 z-10 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-brand-dark shadow-sm hover:bg-muted sm:right-8 sm:top-7" aria-label="Close My Folders"><X className="size-5" /></a>
    <section className="mx-auto w-full max-w-[1480px] px-5 pb-12 pt-20 sm:px-8 sm:pt-24 lg:px-12 lg:pt-28">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Your saved workspace</p><h1 className="mt-1 font-display text-3xl font-bold text-brand-dark">My Folders</h1><p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Your JoeyClub ideas, personal discoveries and activities—together in one calm workspace.</p></div>
        <div className="flex flex-col items-stretch gap-3 lg:items-end"><div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1.5 lg:w-[34rem]">{tabs.map((item) => <TabButton key={item.id} item={item} active={tab === item.id} onClick={() => changeTab(item.id)} />)}</div></div>
      </header>

      {storageWarning && <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#A85C4D]/30 bg-[#A85C4D]/10 px-4 py-3 text-sm text-[#A85C4D]"><span className="flex-1">{storageWarning}</span><button type="button" onClick={dismissStorageWarning} aria-label="Dismiss" className="shrink-0 font-bold hover:underline">Dismiss</button></div>}

      <div className="mt-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className={`grid gap-3 ${tab === 'ideas' ? 'sm:grid-cols-[0.72fr_1.05fr_1.45fr]' : 'sm:grid-cols-[0.8fr_1fr_0.8fr_1.4fr]'}`}>
          {tab === 'ideas' ? <><Select label="Age group" value={age} options={ages} onChange={setAge} /><Select label="EYLF outcome" value={outcome} options={outcomes} onChange={setOutcome} /></> : <><Select label="Setting" value={setting} options={settings} onChange={setSetting} /><Select label="State" value={state} options={states} onChange={setState} /><Select label="Age group" value={age} options={ages} onChange={setAge} /></>}
          <SearchField value={query} onChange={setQuery} />
        </div>
        <FolderControl folder={folder} allLabel={allLabel} folderCount={tabItems.length} folders={Object.keys(folders.custom)} onChange={setFolder} onCreate={() => openAction('create')} onRename={() => openAction('rename')} onDelete={() => openAction('delete')} />
      </div>

      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="w-full overflow-x-auto pt-2 pb-1 sm:w-auto sm:min-w-0 sm:flex-1"><div className="flex w-max items-center gap-3 sm:gap-5">
          <button type="button" onClick={resetView} className={`inline-flex h-11 shrink-0 items-center gap-3 rounded-xl border px-4 text-sm font-bold ${source === 'all' ? 'border-brand-dark bg-card text-brand-dark' : 'border-border bg-card text-muted-foreground'}`}>All resources <span className="inline-flex size-7 items-center justify-center rounded-full bg-background shadow-sm"><RotateCcw className="size-4" /></span></button>
          <SourceFilterButton source="joeyclub" current={source} onClick={setSource} /><SourceFilterButton source="web" current={source} onClick={setSource} /><SourceFilterButton source="created" current={source} onClick={setSource} />
        </div></div>
        <button type="button" onClick={() => setGeneratorOpen(true)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 sm:ml-auto"><Plus className="size-5" />Generate my activity card</button>
      </div>

      <div className="mt-4 border-t border-border pt-7">
        <p className="text-sm text-muted-foreground">{items.length} of {tabItems.length} resources</p>
        {visible.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-border bg-card/60 px-5 py-16 text-center text-muted-foreground">No saved resources match these filters yet.</div> : <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => tab === 'ideas' ? <SavedLearningCard key={item.id} item={item} onEdit={() => setEditItem(item)} onOpenDocuments={() => setDocsItem(item)} onRemove={() => setUnsaveItem(item)} /> : <SavedOutingCard key={item.id} item={item} onEdit={() => setEditItem(item)} onOpenDocuments={() => setDocsItem(item)} onRemove={() => setUnsaveItem(item)} />)}</div>}
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </section>

    {generatorOpen && <GeneratorModal folders={Object.keys(folders.custom)} initialTab={tab} onClose={() => setGeneratorOpen(false)} onSave={(activity, targetFolder) => { addGeneratedActivity(activity, targetFolder); setGeneratorOpen(false); setFolder(targetFolder); setSource(activity.origin ?? 'all'); setTab(isOutingId(activity.id) ? 'outings' : 'ideas') }} />}
    {editItem && <GeneratorModal folders={Object.keys(folders.custom)} initialTab={tab} editItem={editItem} initialFolder={folderForItem(editItem)} onClose={() => setEditItem(null)} onSave={(activity, targetFolder) => { addGeneratedActivity(activity, targetFolder); setEditItem(null); setFolder(targetFolder) }} />}
    {docsItem && <DocumentsModal item={docsItem} onClose={() => setDocsItem(null)} onSave={(documents) => { saveDocumentsForItem(docsItem, documents); setDocsItem(null) }} />}
    {action && <FolderActionDialog action={action} name={folderName} isDefault={folder === 'Default' || folder === '__all__'} onNameChange={setFolderName} onConfirm={confirmAction} onClose={() => setAction(null)} />}
    {unsaveItem && <UnsaveDialog item={unsaveItem} onConfirm={() => { removeSavedItem(unsaveItem); setUnsaveItem(null) }} onClose={() => setUnsaveItem(null)} />}
  </main>
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactElement {
  return <label className="min-w-0 text-sm font-semibold text-brand-dark"><span className="mb-1 block text-[0.68rem] uppercase tracking-wide text-muted-foreground">Search by keywords</span><span className="flex h-11 items-center gap-2 rounded-lg border border-primary bg-card px-4 shadow-sm"><Search className="size-4 shrink-0 text-primary" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search title, keyword, topic or location" className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-muted-foreground" /></span></label>
}

function SourceFilterButton({ source, current, onClick }: { source: SavedOrigin; current: SourceFilter; onClick: (source: SourceFilter) => void }): ReactElement {
  const meta = sourceMeta(source); const Icon = meta.icon; const active = current === source
  return <button type="button" onClick={() => onClick(active ? 'all' : source)} aria-pressed={active} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${meta.className} ${active ? 'ring-2 ring-brand-dark/30 ring-offset-2 ring-offset-background' : 'opacity-80 hover:opacity-100'}`}><Icon className="size-4" />{meta.label}</button>
}

function sourceMeta(origin: SavedOrigin): { label: string; className: string; icon: LucideIcon } {
  if (origin === 'web') return { label: 'Web discoveries', className: 'bg-[#F7E5A9] text-[#6F5918]', icon: Link2 }
  if (origin === 'created') return { label: 'Created by me', className: 'bg-[#D9ECF4] text-[#356A7B]', icon: FilePenLine }
  return { label: 'JoeyClub', className: 'bg-[#DFEAD7] text-[#51745B]', icon: ShieldCheck }
}

function SavedLearningCard({ item, onEdit, onOpenDocuments, onRemove, preview = false }: { item: SavedItem; onEdit?: () => void; onOpenDocuments?: () => void; onRemove: () => void; preview?: boolean }): ReactElement {
  return <CompactResourceCard item={item} onEdit={onEdit} onOpenDocuments={onOpenDocuments} onRemove={onRemove} preview={preview} />
}

function SavedOutingCard({ item, onEdit, onOpenDocuments, onRemove, preview = false }: { item: SavedItem; onEdit?: () => void; onOpenDocuments?: () => void; onRemove: () => void; preview?: boolean }): ReactElement {
  return <CompactResourceCard item={item} onEdit={onEdit} onOpenDocuments={onOpenDocuments} onRemove={onRemove} preview={preview} />
}

function CompactResourceCard({ item, onEdit, onOpenDocuments, onRemove, preview }: { item: SavedItem; onEdit?: () => void; onOpenDocuments?: () => void; onRemove: () => void; preview: boolean }): ReactElement {
  const meta = sourceMeta(item.origin ?? 'joeyclub'); const Icon = meta.icon
  const cardType = displayCardType(item)
  const cover = resolveCover(item)
  const isOutingCard = isOuting(item)
  const canManageDocuments = item.origin === 'web' || item.origin === 'created'
  return <article className="flex h-full min-w-0 flex-col rounded-3xl border border-border bg-card p-5 shadow-[0_16px_36px_-28px_rgba(63,81,54,0.4)]">
    <div className="grid grid-cols-[2fr_3fr] items-start gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream"><Image src={cover} alt="" fill className="object-cover" /></div>
      <div className="flex min-w-0 flex-col items-start"><h2 className="line-clamp-3 font-display text-[1.08rem] font-bold leading-tight text-brand-dark">{item.title}</h2><div className="mt-2 flex max-w-full flex-wrap gap-1.5">{cardType && <span className="inline-flex max-w-full truncate rounded-full bg-badge-green px-2.5 py-1 text-[0.68rem] font-semibold text-badge-green-foreground">{cardType}</span>}{item.eylfOutcomes[0] && <span className="inline-flex rounded-full bg-badge-yellow px-2.5 py-1 text-[0.68rem] font-semibold text-badge-yellow-foreground">{item.eylfDetail ? `EYLF ${item.eylfDetail}` : `EYLF ${item.eylfOutcomes[0]}`}</span>}</div></div>
    </div>
    <p className="mt-4 line-clamp-2 min-h-12 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
    <div className="mt-3 flex min-w-0 items-center gap-3">{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground">Visit site <ExternalLink className="size-3.5" /></a> : <span className="inline-flex h-10 items-center rounded-full bg-muted px-3.5 text-sm font-semibold text-muted-foreground">Personal activity</span>}{isOutingCard && item.location ? <span className="min-w-0 truncate text-sm font-semibold text-muted-foreground"><MapPin className="mr-1 inline size-3.5 text-primary" />{item.location}</span> : <span className="min-w-0 truncate text-sm font-semibold text-muted-foreground">{item.sourceName}</span>}{!preview && <div className="ml-auto flex shrink-0 items-center gap-2">{canManageDocuments && onOpenDocuments && <button type="button" onClick={onOpenDocuments} aria-label="View attached files" className="inline-flex size-9 items-center justify-center rounded-full border border-primary/40 text-primary hover:bg-[#EDF3E8]"><Eye className="size-4" /></button>}{onEdit && <button type="button" onClick={onEdit} aria-label="Edit this card" className="inline-flex size-9 items-center justify-center rounded-full border border-primary/40 text-primary hover:bg-[#EDF3E8]"><Pencil className="size-4" /></button>}<button type="button" onClick={onRemove} aria-label="Unsave this card" className="inline-flex size-9 items-center justify-center rounded-full border border-[#A85C4D]/40 text-[#A85C4D] hover:bg-[#A85C4D]/10"><Trash2 className="size-4" /></button></div>}</div>
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs font-semibold text-foreground/80"><span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-2 py-1.5"><AgeMeta item={item} /></span><span className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-bold ${meta.className}`}><Icon className="size-3.5" />{meta.label}</span></div>
  </article>
}

function AgeMeta({ item }: { item: SavedItem }): ReactElement {
  const age = displayAge(item); const Icon = age === '1–3 yrs' ? Baby : Users
  return <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-brand-dark"><Icon className="size-4 text-primary" />{age}</span>
}

function TabButton({ item, active, onClick }: { item: { id: FolderTab; label: string }; active: boolean; onClick: () => void }): ReactElement {
  return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/75 hover:text-primary'}`}>{item.label}</button>
}

function FolderControl({ folder, allLabel, folderCount, folders, onChange, onCreate, onRename, onDelete }: { folder: string; allLabel: string; folderCount: number; folders: string[]; onChange: (folder: string) => void; onCreate: () => void; onRename: () => void; onDelete: () => void }): ReactElement {
  const disabled = folder === 'Default' || folder === '__all__'
  const options = [{ value: '__all__', label: allLabel }, ...folders.map((name) => ({ value: name, label: name }))]
  const label = folder === '__all__' ? `${allLabel} · ${folderCount} saved` : `${folder} · ${folderCount} saved`
  return <div><span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">Folders</span><div className="flex min-w-0 items-center gap-2 lg:min-w-[22rem]"><MenuSelect value={folder} options={options} onChange={onChange} ariaLabel="Switch folder" buttonLabel={label} /><IconButton label="Rename folder" onClick={onRename} disabled={disabled}><Pencil className="size-4" /></IconButton><IconButton label="Create folder" onClick={onCreate}><Plus className="size-4" /></IconButton><IconButton label="Delete folder" onClick={onDelete} disabled={disabled}><Trash2 className="size-4" /></IconButton></div></div>
}

function IconButton({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: ReactElement; disabled?: boolean }): ReactElement {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35">{children}</button>
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }): ReactElement {
  return <label className="min-w-0 text-sm font-semibold text-brand-dark"><span className="mb-1 block text-[0.68rem] uppercase tracking-wide text-muted-foreground">{label}</span><MenuSelect value={value} options={options.map((option) => ({ value: option, label: option }))} onChange={onChange} ariaLabel={label} /></label>
}

function MenuSelect({ value, options, onChange, ariaLabel, buttonLabel }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; ariaLabel: string; buttonLabel?: string }): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent): void => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const label = buttonLabel ?? options.find((option) => option.value === value)?.label ?? value
  return <div ref={ref} className="relative min-w-0 flex-1"><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={ariaLabel} className="flex h-11 w-full items-center justify-between rounded-lg border border-primary bg-card px-4 text-left text-sm font-semibold text-brand-dark shadow-sm"><span className="truncate">{label}</span><ChevronDown className={`ml-3 size-4 shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{options.map((option) => <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false) }} className={`block w-full rounded-md px-4 py-2.5 text-left text-sm hover:bg-[#EDF3E8] ${option.value === value ? 'bg-[#DCE8D2] font-semibold text-brand-dark' : 'text-brand-dark'}`}>{option.label}</button>)}</div>}</div>
}

function GeneratorModal({ folders, initialTab, editItem, initialFolder, onClose, onSave }: { folders: string[]; initialTab: FolderTab; editItem?: SavedItem; initialFolder?: string; onClose: () => void; onSave: (activity: ActivityCard, folder: string) => void }): ReactElement {
  const [origin, setOrigin] = useState<SavedOrigin>(editItem?.origin ?? 'web')
  const [kind, setKind] = useState<FolderTab>(editItem ? (isOuting(editItem) ? 'outings' : 'ideas') : initialTab)
  const [url, setUrl] = useState(editItem?.sourceUrl ?? '')
  const [title, setTitle] = useState(editItem?.title ?? '')
  const [description, setDescription] = useState(editItem?.description ?? '')
  const [image, setImage] = useState(editItem?.image ?? '')
  const [activityType, setActivityType] = useState(editItem?.activityType ?? '')
  const [topic, setTopic] = useState(editItem?.topic ?? '')
  const [age, setAge] = useState(editItem?.ageLabel ?? 'All Ages')
  const [eylf, setEylf] = useState<string>(editItem?.eylfOutcomes[0] ?? 'Not specified')
  const [eylfDetail, setEylfDetail] = useState(editItem?.eylfDetail ?? '')
  const [location, setLocation] = useState(editItem?.location ?? '')
  const [docFile, setDocFile] = useState<SavedDocument | null>(editItem?.documents?.[0] ?? null)
  const [docFileError, setDocFileError] = useState('')
  const [folder, setFolder] = useState(initialFolder ?? folders[0] ?? 'Default')
  const [reviewing, setReviewing] = useState(false)
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [providerName, setProviderName] = useState('')
  const [stateTerritory, setStateTerritory] = useState('')
  const [practicalFeatures, setPracticalFeatures] = useState<string[]>([])
  const { user, refreshUser, resendVerificationCode } = useAuth()
  const [authPromptStep, setAuthPromptStep] = useState<'login' | 'verify-email' | null>(null)

  const openVerifyEmail = (): void => { void resendVerificationCode(); setAuthPromptStep('verify-email') }

  const analyseLink = async (): Promise<void> => {
    if (!url.trim() || analysisState === 'loading') return
    if (!user) { setAuthPromptStep('login'); return }
    setAnalysisState('loading'); setAnalysisMessage('Analysing the page and matching it to JoeyClub fields…')
    try {
      const response = await fetch('/api/activity-card-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim(), kind }) })
      const result = await response.json() as { error?: string; code?: string; title?: string; description?: string; activityType?: string; topic?: string; age?: string; eylfOutcome?: string | null; eylfDetail?: string; location?: string; providerName?: string; stateTerritory?: string; practicalFeatures?: string[]; analysisMode?: 'ai' | 'metadata'; confidenceScore?: number; reviewReason?: string; creditsRemaining?: number }
      if (!response.ok) {
        if (result.code === 'auth_required') setAuthPromptStep('login')
        throw new Error(result.error || 'The page could not be analysed.')
      }
      if (typeof result.creditsRemaining === 'number') void refreshUser()
      if (result.title) setTitle(result.title)
      if (result.description) setDescription(result.description)
      setActivityType(result.activityType ?? '')
      setTopic(result.topic ?? '')
      if (result.age && ages.includes(result.age)) setAge(result.age)
      setEylf(result.eylfOutcome && outcomes.some((value) => value.startsWith(result.eylfOutcome!)) ? result.eylfOutcome : 'Not specified')
      setEylfDetail(result.eylfDetail ?? '')
      setLocation(result.location ?? '')
      setProviderName(result.providerName ?? '')
      setStateTerritory(result.stateTerritory ?? '')
      setPracticalFeatures(Array.isArray(result.practicalFeatures) ? result.practicalFeatures : [])
      const mode = result.analysisMode === 'metadata' ? 'Page details extracted; AI enrichment was unavailable' : 'AI analysis complete'
      setAnalysisState('success'); setAnalysisMessage(`${mode} — review or edit the fields below.`)
    } catch (error) {
      setProviderName(''); setStateTerritory(''); setPracticalFeatures([])
      setAnalysisState('error'); setAnalysisMessage(error instanceof Error ? error.message : 'The page could not be analysed. You can still enter the details manually.')
    }
  }

  const generate = (): void => {
    if (!title.trim() && origin === 'web' && url.trim()) {
      try { setTitle(new URL(url).hostname.replace(/^www\./, '').split('.')[0].replace(/(^|[-_])\w/g, (value) => value.replace(/[-_]/, ' ').toUpperCase())) } catch { setTitle('My web discovery') }
    }
    setReviewing(true)
  }
  const save = (): void => {
    const timestamp = Date.now()
    const ageGroup: SavedAgeGroup = age === '1–3 yrs' ? 'Toddlers' : age === '3–5 yrs' ? 'Pre-school' : 'All ages'
    const activity: ActivityCard = {
      id: editItem?.id ?? `${kind === 'outings' ? 'adventure-' : 'personal-'}${timestamp}`,
      title: title.trim() || (kind === 'outings' ? 'My local outing' : 'My learning idea'),
      description: description.trim() || 'A personal activity saved to revisit later.',
      image: image || undefined,
      sourceUrl: origin === 'web' ? url.trim() : (editItem?.sourceUrl ?? ''),
      environment: kind === 'outings' ? 'Mixed' : 'Indoor',
      ageGroup,
      ageLabel: age,
      eylfOutcomes: eylf === 'Not specified' ? [] : [eylf as EylfOutcome],
      eylfDetail: eylf === 'Not specified' ? '' : eylfDetail.trim(),
      tags: [activityType.trim(), topic.trim()].filter(Boolean),
      activityType: activityType.trim(),
      topic: topic.trim(),
      location: location.trim(),
      origin,
      sourceName: resolveSourceName(origin, url, editItem?.sourceName),
      // This form only manages one attachment slot; the eye-icon file manager
      // on the saved card can add more afterwards. Preserve any of those
      // extra files here instead of dropping them when this form saves.
      documents: docFile ? [docFile, ...(editItem?.documents?.slice(1) ?? [])] : (editItem?.documents?.slice(1) ?? []),
    }
    onSave(activity, folder)
  }
  const upload = (file?: File): void => { if (!file) return; const reader = new FileReader(); reader.onload = () => setImage(String(reader.result ?? '')); reader.readAsDataURL(file) }
  // Saved items live in browser localStorage, so an attached file is kept as
  // a base64 data URL there too. A hard size cap keeps one large PDF from
  // blowing the storage quota for every other saved card.
  const uploadDocument = (file?: File): void => {
    if (!file) return
    if (file.size > MAX_DOCUMENT_FILE_BYTES) { setDocFileError('This file is too large to attach (max 4MB per file).'); return }
    const otherDocumentBytes = (editItem?.documents?.slice(1) ?? []).reduce((sum, doc) => sum + estimateDataUrlBytes(doc.dataUrl), 0)
    if (otherDocumentBytes + file.size > MAX_CARD_DOCUMENT_BYTES) { setDocFileError('This card has reached its 10MB attachment limit.'); return }
    setDocFileError('')
    const reader = new FileReader()
    reader.onload = () => setDocFile({ name: file.name, dataUrl: String(reader.result ?? '') })
    reader.readAsDataURL(file)
  }

  return <><div className="fixed inset-0 z-[95] overflow-y-auto bg-brand-dark/35 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="generator-title"><div className="mx-auto w-full max-w-4xl rounded-[1.7rem] border border-border bg-background p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between gap-4"><div><h2 id="generator-title" className="font-display text-2xl font-bold text-brand-dark">{editItem ? 'Edit my card' : 'Generate my activity card'}</h2><p className="mt-1 text-sm text-muted-foreground">Save a useful link or document an activity you created.</p>{user && (user.emailVerified ? <p className="mt-1 text-xs font-semibold text-primary">{user.credits} AI analysis credit{user.credits === 1 ? '' : 's'} left · beta cap, more ways to earn credits are coming soon</p> : <button type="button" onClick={openVerifyEmail} className="mt-1 text-left text-xs font-semibold text-[#A85C4D] underline underline-offset-2 hover:text-brand-dark">Verify your email to activate your 10 free AI analysis credits</button>)}</div><button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card"><X className="size-4" /></button></div>
    {!reviewing ? <>
      {origin === 'joeyclub' ? <div className="mx-auto mt-6 w-full rounded-2xl bg-[#DFEAD7] px-4 py-3 text-center sm:w-3/5"><span className="inline-flex items-center gap-2 text-sm font-bold text-[#51745B]"><ShieldCheck className="size-4" />JoeyClub official resource</span></div> : <div className="mx-auto mt-6 grid w-full grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5 sm:w-3/5"><button type="button" onClick={() => setOrigin('web')} className={`rounded-xl px-4 py-3 text-sm font-bold ${origin === 'web' ? 'bg-[#F7E5A9] text-[#6F5918] shadow-sm' : 'text-muted-foreground'}`}><span className="inline-flex items-center gap-2"><Link2 className="size-4" />Web discovery</span></button><button type="button" onClick={() => setOrigin('created')} className={`rounded-xl px-4 py-3 text-sm font-bold ${origin === 'created' ? 'bg-[#D9ECF4] text-[#356A7B] shadow-sm' : 'text-muted-foreground'}`}><span className="inline-flex items-center gap-2"><FilePenLine className="size-4" />Create my own</span></button></div>}
      <div className="mt-6 grid items-end gap-4 sm:grid-cols-2"><Field label="Resource format"><div className="grid grid-cols-2 gap-2"><Choice active={kind === 'ideas'} onClick={() => setKind('ideas')}>Learning idea</Choice><Choice active={kind === 'outings'} onClick={() => setKind('outings')}>Outing / venue</Choice></div></Field><Select label="Save to folder" value={folder} options={folders.length ? folders : ['Default']} onChange={setFolder} /></div>
      {origin === 'web' && <div className="mt-4"><Field label="Website link"><div className="flex h-11 overflow-hidden rounded-lg border border-primary bg-card shadow-sm"><input type="url" value={url} onChange={(event) => { setUrl(event.target.value); setAnalysisState('idle'); setAnalysisMessage(''); setProviderName(''); setStateTerritory(''); setPracticalFeatures([]) }} placeholder="https://..." className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground" /><button type="button" onClick={analyseLink} disabled={!url.trim() || analysisState === 'loading' || (user !== null && user.credits <= 0)} className="inline-flex shrink-0 items-center gap-2 border-l border-primary/30 bg-[#EDF3E8] px-4 text-xs font-bold text-primary hover:bg-[#DFEAD7] disabled:opacity-45">{analysisState === 'loading' ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{analysisState === 'loading' ? 'Analysing…' : 'Analyse with AI'}</button></div></Field>{analysisMessage && <p className={`mt-2 text-xs ${analysisState === 'error' ? 'text-[#A85C4D]' : 'text-primary'}`}>{analysisMessage}</p>}{analysisState === 'success' && (providerName || stateTerritory || practicalFeatures.length > 0) && <div className="mt-2 flex flex-wrap gap-1.5 text-[0.7rem]">{providerName && <span className="rounded-full border border-primary/30 bg-[#EDF3E8] px-2.5 py-1 font-semibold text-primary">Provider: {providerName}</span>}{stateTerritory && <span className="rounded-full border border-primary/30 bg-[#EDF3E8] px-2.5 py-1 font-semibold text-primary">{stateTerritory}</span>}{practicalFeatures.map((feature) => <span key={feature} className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">{feature}</span>)}</div>}</div>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Title"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name this activity" className={inputClass} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Activity type"><ComboField value={activityType} onChange={setActivityType} options={ACTIVITY_TYPE_OPTIONS} placeholder="e.g. Arts & Crafts" /></Field><Field label="Topic (optional)"><ComboField value={topic} onChange={setTopic} options={TOPIC_OPTIONS} placeholder="e.g. Animal Encounters" /></Field></div></div>
      <div className="mt-4"><Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What will children do, notice or learn?" className={`${inputClass} h-auto resize-none py-3`} /></Field></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3"><Select label="Age group" value={age} options={ages} onChange={setAge} /><Field label={origin === 'created' ? 'Upload a photo (optional)' : 'Cover image (optional)'}><label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-primary bg-card text-sm font-semibold text-primary"><Upload className="size-4" />{image ? 'Photo added' : 'Choose photo'}<input type="file" accept="image/*" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} /></label></Field><Field label="Upload img / PDF (optional)"><div><label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-primary bg-card text-sm font-semibold text-primary"><Upload className="size-4" /><span className="truncate">{docFile ? docFile.name : 'Choose file'}</span><input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => uploadDocument(event.target.files?.[0])} /></label>{docFileError && <p className="mt-1 text-[0.68rem] text-[#A85C4D]">{docFileError}</p>}<p className="mt-1 text-[0.68rem] text-muted-foreground">Files stay on this device. Please follow our <a href="/upload-policy" target="_blank" rel="noreferrer" className="font-semibold text-primary underline hover:text-brand-dark">upload guidelines</a>.</p></div></Field></div>
      <div className={`mt-4 grid gap-4 ${kind === 'outings' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}><Select label="EYLF outcome" value={eylf} options={['Not specified', ...outcomes.slice(1).map((value) => value.split(' (')[0])]} onChange={(value) => { setEylf(value); if (value === 'Not specified') setEylfDetail('') }} /><Field label="EYLF detail (optional)"><input value={eylfDetail} onChange={(event) => setEylfDetail(event.target.value)} disabled={eylf === 'Not specified'} placeholder="e.g. 2.1" className={`${inputClass} disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60`} /></Field>{kind === 'outings' && <Field label="Location"><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Suburb, state" className={inputClass} /></Field>}</div>
      <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground">Cancel</button><button type="button" onClick={generate} disabled={origin === 'web' && !url.trim() && !title.trim()} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Generate preview</button></div>
    </> : <div className="mt-6"><p className="text-center text-sm font-bold text-brand-dark">Review your card</p><div className="mx-auto mt-3 w-full max-w-[460px]">{kind === 'ideas' ? <SavedLearningCard item={previewItem({ origin, kind, url, title, description, image, activityType, topic, age, eylf, eylfDetail, location, sourceName: editItem?.sourceName })} onRemove={() => undefined} preview /> : <SavedOutingCard item={previewItem({ origin, kind, url, title, description, image, activityType, topic, age, eylf, eylfDetail, location, sourceName: editItem?.sourceName })} onRemove={() => undefined} preview />}</div><div className="mt-7 flex justify-end gap-2"><button type="button" onClick={() => setReviewing(false)} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-brand-dark">Edit / Back</button><button type="button" onClick={save} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Save to {folder}</button></div></div>}
  </div></div>
  {authPromptStep && <AuthModal initialMode={authPromptStep} onClose={() => setAuthPromptStep(null)} />}
  </>
}

function dataUrlToBlobUrl(dataUrl: string): string {
  const [header, base64 = ''] = dataUrl.split(',')
  const mime = header?.match(/data:(.*?);base64/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}
function isImageDocument(doc: SavedDocument): boolean { return doc.dataUrl.startsWith('data:image/') }
function isPdfDocument(doc: SavedDocument): boolean { return doc.dataUrl.startsWith('data:application/pdf') }

/**
 * One modal covers two states for the eye icon: a card with no attachments
 * yet asks whether to add one and, once confirmed, becomes the same add/
 * remove file manager; a card that already has files opens straight into
 * viewing them, with a way to add more from there too.
 */
function DocumentsModal({ item, onClose, onSave }: { item: SavedItem; onClose: () => void; onSave: (documents: SavedDocument[]) => void }): ReactElement {
  const [documents, setDocuments] = useState<SavedDocument[]>(item.documents ?? [])
  const [mode, setMode] = useState<'confirm' | 'manage' | 'preview'>(documents.length > 0 ? 'preview' : 'confirm')
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState('')
  const activeDocument = documents[activeIndex] ?? null

  const blobUrl = useMemo(() => activeDocument ? dataUrlToBlobUrl(activeDocument.dataUrl) : null, [activeDocument])
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }, [blobUrl])

  const totalBytes = (list: SavedDocument[]): number => list.reduce((sum, doc) => sum + estimateDataUrlBytes(doc.dataUrl), 0)
  const addFile = (file?: File): void => {
    if (!file) return
    if (file.size > MAX_DOCUMENT_FILE_BYTES) { setError('This file is too large to attach (max 4MB per file).'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      const next = [...documents, { name: file.name, dataUrl }]
      if (totalBytes(next) > MAX_CARD_DOCUMENT_BYTES) { setError('This card has reached its 10MB attachment limit.'); return }
      setError('')
      setDocuments(next)
    }
    reader.readAsDataURL(file)
  }
  const removeFile = (index: number): void => {
    setDocuments((current) => current.filter((_, position) => position !== index))
    setActiveIndex(0)
  }
  const confirmAndClose = (): void => { onSave(documents); onClose() }

  return <div className="fixed inset-0 z-[95] grid place-items-center bg-brand-dark/35 p-4" role="dialog" aria-modal="true" aria-labelledby="documents-modal-title">
    <div className="w-full max-w-lg rounded-[1.7rem] border border-border bg-background p-5 shadow-2xl sm:p-7">
      {mode === 'confirm' && <>
        <div className="flex items-start justify-between gap-4"><h2 id="documents-modal-title" className="font-display text-xl font-bold text-brand-dark">No files added yet</h2><button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"><X className="size-4" /></button></div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">This card doesn&rsquo;t have any files yet. Would you like to add one now?</p>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground">No</button><button type="button" onClick={() => setMode('manage')} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Yes, add a file</button></div>
      </>}

      {mode === 'manage' && <>
        <div className="flex items-start justify-between gap-4"><h2 className="font-display text-xl font-bold text-brand-dark">Add files</h2><button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"><X className="size-4" /></button></div>
        <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-primary bg-card text-sm font-semibold text-primary"><Upload className="size-4" />Choose photo or PDF<input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => { addFile(event.target.files?.[0]); event.target.value = '' }} /></label>
        {error && <p className="mt-2 text-xs text-[#A85C4D]">{error}</p>}
        <p className="mt-2 text-[0.68rem] text-muted-foreground">Files stay on this device. Please follow our <a href="/upload-policy" target="_blank" rel="noreferrer" className="font-semibold text-primary underline hover:text-brand-dark">upload guidelines</a>.</p>
        {documents.length > 0 && <ul className="mt-4 space-y-2">{documents.map((doc, index) => <li key={`${doc.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-brand-dark"><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{doc.name} has been added</span><button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${doc.name}`} className="shrink-0 text-[#A85C4D] hover:underline">Remove</button></li>)}</ul>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground">Cancel</button><button type="button" onClick={confirmAndClose} disabled={documents.length === 0} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Confirm</button></div>
      </>}

      {mode === 'preview' && activeDocument && <>
        <div className="flex items-start justify-between gap-4"><h2 className="min-w-0 truncate font-display text-lg font-bold text-brand-dark">{activeDocument.name}</h2><button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"><X className="size-4" /></button></div>
        {documents.length > 1 && <div className="mt-3 flex flex-wrap gap-1.5">{documents.map((doc, index) => <button key={`${doc.name}-${index}`} type="button" onClick={() => setActiveIndex(index)} className={`max-w-full truncate rounded-full px-3 py-1.5 text-xs font-semibold ${index === activeIndex ? 'bg-[#DCE8D2] text-brand-dark' : 'border border-border bg-card text-muted-foreground'}`}>{doc.name}</button>)}</div>}
        <div className="mt-4 flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-border bg-cream">
          {isImageDocument(activeDocument) && <img src={activeDocument.dataUrl} alt={activeDocument.name} className="max-h-[60vh] w-full object-contain" />}
          {isPdfDocument(activeDocument) && blobUrl && <embed src={blobUrl} type="application/pdf" className="h-[60vh] w-full" />}
          {!isImageDocument(activeDocument) && !isPdfDocument(activeDocument) && <p className="p-6 text-center text-sm text-muted-foreground">This file type can&rsquo;t be previewed here — use download instead.</p>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setMode('manage')} className="text-sm font-bold text-primary hover:underline">+ Add or remove files</button>
          <div className="flex gap-2">
            {blobUrl && <a href={blobUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-primary/40 px-3.5 text-sm font-bold text-primary hover:bg-[#EDF3E8]"><ExternalLink className="size-3.5" />Open in new tab</a>}
            {blobUrl && <a href={blobUrl} download={activeDocument.name} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"><Download className="size-3.5" />Download</a>}
          </div>
        </div>
      </>}
    </div>
  </div>
}

const inputClass = 'h-11 w-full rounded-lg border border-primary bg-card px-4 text-sm text-brand-dark outline-none placeholder:text-muted-foreground'

function Field({ label, children }: { label: string; children: ReactElement }): ReactElement { return <label className="block text-sm font-semibold text-brand-dark"><span className="mb-1 block text-[0.68rem] uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label> }
function ComboField({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent): void => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return <div ref={ref} className="relative">
    <div className="flex h-11 items-center rounded-lg border border-primary bg-card pr-1.5 shadow-sm">
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-brand-dark outline-none placeholder:text-muted-foreground" />
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Show suggestions" aria-expanded={open} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-primary"><ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    </div>
    {open && <div className="absolute left-0 right-0 z-30 mt-2 max-h-60 overflow-auto rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{options.map((option) => <button key={option} type="button" onClick={() => { onChange(option); setOpen(false) }} className={`block w-full truncate rounded-md px-4 py-2.5 text-left text-sm hover:bg-[#EDF3E8] ${option === value ? 'bg-[#DCE8D2] font-semibold text-brand-dark' : 'text-brand-dark'}`}>{option}</button>)}</div>}
  </div>
}
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }): ReactElement { return <button type="button" onClick={onClick} className={`h-11 rounded-lg border text-sm font-bold ${active ? 'border-primary bg-[#DFEAD7] text-brand-dark' : 'border-border bg-card text-muted-foreground'}`}>{children}</button> }

type PreviewInput = { origin: SavedOrigin; kind: FolderTab; url: string; title: string; description: string; image: string; activityType: string; topic: string; age: string; eylf: string; eylfDetail: string; location: string; sourceName?: string }
function previewItem(input: PreviewInput): SavedItem {
  const ageGroup: SavedAgeGroup = input.age === '1–3 yrs' ? 'Toddlers' : input.age === '3–5 yrs' ? 'Pre-school' : 'All ages'
  const tag = input.kind === 'ideas' ? input.activityType.trim() : input.topic.trim()
  return { id: input.kind === 'outings' ? 'adventure-preview' : 'preview', type: 'activity', title: input.title || 'My new activity', description: input.description || 'Add a short description so this activity is easy to revisit.', image: input.image || undefined, sourceUrl: input.url, environment: input.kind === 'outings' ? 'Mixed' : 'Indoor', ageGroup, ageLabel: input.age, eylfOutcomes: input.eylf === 'Not specified' ? [] : [input.eylf as EylfOutcome], eylfDetail: input.eylf === 'Not specified' ? '' : input.eylfDetail, tags: tag ? [tag] : [], activityType: input.activityType, topic: input.topic, location: input.location, origin: input.origin, sourceName: resolveSourceName(input.origin, input.url, input.sourceName), savedAt: new Date().toISOString() }
}
function resolveSourceName(origin: SavedOrigin, url: string, editItemSourceName?: string): string {
  if (origin === 'created') return 'My activity'
  if (origin === 'joeyclub') return editItemSourceName ?? 'JoeyClub'
  return webSource(url)
}

function FolderActionDialog({ action, name, isDefault, onNameChange, onConfirm, onClose }: { action: Exclude<FolderAction, null>; name: string; isDefault: boolean; onNameChange: (value: string) => void; onConfirm: () => void; onClose: () => void }): ReactElement {
  const isDelete = action === 'delete'; const title = action === 'create' ? 'Create a folder' : isDelete ? 'Delete this folder?' : 'Rename folder'
  return <div className="fixed inset-0 z-[95] grid place-items-center bg-brand-dark/30 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl"><h2 className="font-display text-xl font-bold text-brand-dark">{title}</h2>{isDelete ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">This removes the folder only. Your saved activities stay available in All resources.</p> : <input autoFocus value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Folder name" className={`${inputClass} mt-4`} />}{isDefault && <p className="mt-2 text-sm text-[#A85C4D]">Default cannot be renamed or deleted.</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground">Cancel</button><button type="button" disabled={isDefault} onClick={onConfirm} className={`rounded-lg px-3 py-2 text-sm font-bold text-white ${isDelete ? 'bg-[#A85C4D]' : 'bg-primary'} disabled:opacity-40`}>{isDelete ? 'Yes, delete' : 'Confirm'}</button></div></div></div>
}

function UnsaveDialog({ item, onConfirm, onClose }: { item: SavedItem; onConfirm: () => void; onClose: () => void }): ReactElement {
  return <div className="fixed inset-0 z-[95] grid place-items-center bg-brand-dark/30 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl"><h2 className="font-display text-xl font-bold leading-snug text-brand-dark">Unsave “{item.title}”?</h2><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground">No</button><button type="button" onClick={onConfirm} className="rounded-lg bg-[#A85C4D] px-4 py-2.5 text-sm font-bold text-white">Yes</button></div></div></div>
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }): ReactElement {
  return <nav className="mt-8 flex items-center justify-center gap-2"><button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary disabled:opacity-40"><ChevronLeft className="size-4" /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} type="button" onClick={() => onChange(number)} className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${page === number ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted'}`}>{number}</button>)}<button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary disabled:opacity-40"><ChevronRight className="size-4" /></button></nav>
}

function matchesFilters(item: SavedItem, filters: { tab: FolderTab; setting: string; state: string; age: string; outcome: string; query: string; source: SourceFilter }): boolean {
  const text = [item.title, item.description, item.sourceName, item.location, item.activityType, item.topic, ...(item.tags ?? []), ...item.eylfOutcomes].join(' ').toLowerCase()
  const itemOrigin = item.origin ?? 'joeyclub'
  return (filters.source === 'all' || itemOrigin === filters.source)
    && (filters.query.trim() === '' || filters.query.toLowerCase().trim().split(/\s+/).every((word) => text.includes(word)))
    && (filters.age === 'All Ages' || displayAge(item) === filters.age || displayAge(item) === 'All Ages')
    && (filters.tab === 'outings' || filters.outcome === 'All Outcomes' || item.eylfOutcomes.some((value) => filters.outcome.startsWith(value)))
    && (filters.tab === 'ideas' || filters.setting === 'All Settings' || item.environment === filters.setting)
    && (filters.tab === 'ideas' || filters.state === 'All States' || stateForItem(item) === filters.state)
}

function isOutingId(id: string): boolean { return id.startsWith('adventure-') }
function isOuting(item: SavedItem): boolean { return isOutingId(item.id) }
function displayCardType(item: SavedItem): string {
  const explicit = item.activityType?.trim() || item.topic?.trim()
  if (explicit) return explicit
  return (item.origin ?? 'joeyclub') === 'joeyclub' ? (item.tags?.[0]?.trim() ?? '') : ''
}
function resolveCover(item: SavedItem): string {
  // JoeyClub's own catalogue resources must always show the current official
  // illustration for their type — never a stale image cached on the saved
  // item from before the artwork was updated. Web-discovery and
  // created-by-me items keep whatever real image the member attached.
  if ((item.origin ?? 'joeyclub') === 'joeyclub') return activityTypeCardImage(item.activityType) ?? item.image ?? fallbackCover(item)
  return item.image || fallbackCover(item)
}
function fallbackCover(item: SavedItem): string {
  // Learning ideas always carry a canonical activity type, so their cover is
  // paired strictly by that field — the same pairing the Early Years
  // Learning Explorer uses — instead of a fuzzy scan of the title/description.
  const strictMatch = activityTypeCardImage(item.activityType)
  if (strictMatch) return strictMatch
  if (isOuting(item)) return outingFallbackCover(item)
  return '/cards/activity-arts-crafts.png'
}
function outingFallbackCover(item: SavedItem): string {
  const text = `${item.topic ?? ''} ${item.title} ${item.description ?? ''}`.toLowerCase()
  if (/story|letter|literacy|book|read|writing/.test(text)) return '/cards/activity-stories-letters.png'
  if (/stem|science|experiment|discovery|math/.test(text)) return '/cards/activity-stem-nature.png'
  if (/sensory|messy|water|playdough/.test(text)) return '/cards/activity-sensory-messy.png'
  if (/music|video|dance|song|rhyme/.test(text)) return '/cards/activity-music-video.png'
  return '/cards/activity-outdoor-physical.png'
}
function displayAge(item: SavedItem): string { return item.ageLabel ?? (item.ageGroup === 'Toddlers' ? '1–3 yrs' : item.ageGroup === 'All ages' ? 'All Ages' : '3–5 yrs') }
const IGNORED_DOMAIN_LABELS = new Set(['com', 'net', 'org', 'au', 'co', 'io', 'nz', 'uk', 'gov'])
function webSource(url: string): string {
  let hostname: string
  try { hostname = new URL(url).hostname.replace(/^www\./, '') } catch { return 'Web discovery' }
  // Match the same friendly provider names the Early Years Learning Explorer
  // shows, instead of a raw "teachstarter.com"-style hostname.
  const known = Object.values(RESOURCE_SOURCE_WHITELIST).find((entry) => entry.domains.some((domain: string) => hostname === domain || hostname.endsWith(`.${domain}`)))
  if (known) return known.name
  const label = hostname.split('.').find((part) => !IGNORED_DOMAIN_LABELS.has(part)) ?? hostname
  return label.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
function stateForItem(item: SavedItem): string {
  const text = `${item.location ?? ''} ${item.title} ${item.description ?? ''}`.toLowerCase()
  if (/nsw|sydney/.test(text)) return 'New South Wales (NSW)'
  if (/qld|queensland|brisbane/.test(text)) return 'Queensland (QLD)'
  if (/wa|western australia|perth/.test(text)) return 'Western Australia (WA)'
  if (/vic|victoria|melbourne|kew/.test(text)) return 'Victoria (VIC)'
  return 'Other'
}
