import { SEARCH_RESOURCES } from '@/lib/mock-resources'

/** Ordered by JoeyClub's current discovery priority. */
export const RESOURCE_SOURCE_WHITELIST = {
  twinkl: { name: 'Twinkl', domains: ['twinkl.com', 'twinkl.com.au'] },
  teachersPayTeachers: { name: 'Teachers Pay Teachers', domains: ['teacherspayteachers.com'] },
  teachStarter: { name: 'Teach Starter', domains: ['teachstarter.com'] },
  stemeez: { name: 'STEMeez', domains: ['stemeez.com.au'] },
  abcKids: { name: 'ABC Kids', domains: ['abc.net.au', 'iview.abc.net.au'] },
  youtubeKids: { name: 'YouTube Kids', domains: ['youtube.com', 'youtubekids.com'] },
  raisingChildren: { name: 'Raising Children Network', domains: ['raisingchildren.net.au'] },
  earlyChildhoodAustralia: { name: 'Early Childhood Australia', domains: ['earlychildhoodaustralia.org.au'] },
  playgroupNsw: { name: 'Playgroup NSW', domains: ['playgroupnsw.org.au'] },
  cbeebies: { name: 'CBeebies', domains: ['cbeebies.com'] },
  joeysearch: { name: 'JoeySearch verified resource', domains: ['joeyclub.local'] },
} as const

export type WhitelistedSourceId = keyof typeof RESOURCE_SOURCE_WHITELIST
export type AgeStage = '0 - 3 yrs (Babies & Toddlers)' | '3 - 5 yrs (Kinders & Preschoolers)'
export type Setting = 'Individual (1-on-1)' | 'Group'
export type ActivityType = string
export type Topic = string
export type EylfOutcome = string
export type LearningArea = string
export type ResourceFormat = string

export interface SearchResource {
  id: string
  title: string
  description: string
  ages: string
  ageStage: AgeStage
  setting: Setting
  activityType: ActivityType
  topic: Topic
  /** Present only when the source page explicitly identifies an EYLF outcome. */
  eylfOutcome?: EylfOutcome
  learningArea: LearningArea
  format: ResourceFormat
  source: WhitelistedSourceId
  /** A direct activity, resource, video, or product detail page - never a source home page. */
  sourceUrl: string
  image: string
  /** Explains whether a tag comes from source metadata or page content. */
  classificationBasis: 'source_metadata' | 'source_content'
  classificationNote: string
  verificationStatus: 'curated_deep_link' | 'source_linked'
}

export { SEARCH_RESOURCES }
