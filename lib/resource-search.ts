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
} as const

export type WhitelistedSourceId = keyof typeof RESOURCE_SOURCE_WHITELIST
export type AgeStage = '0 - 3 yrs (Babies & Toddlers)' | '3 - 5 yrs (Kinders & Preschoolers)'
export type Setting = 'Individual (1-on-1)' | 'Group'
export type ActivityType = 'Arts & Crafts' | 'STEM' | 'Music & Movement' | 'Literacy & Storytelling' | 'Sensory & Messy Play' | 'Outdoor & Physical Play'
export type Topic = 'First Nations Culture' | 'Cultures & Festivals' | 'Sustainability & Nature' | 'Social-Emotional Wellbeing'
export type EylfOutcome = 'Outcome 1: Children have a strong sense of identity' | 'Outcome 2: Children are connected with and contribute to their world' | 'Outcome 3: Children have a strong sense of wellbeing' | 'Outcome 4: Children are confident and involved learners' | 'Outcome 5: Children are effective communicators'
export type LearningArea = 'Social & Emotional Learning' | 'Language & Communication' | 'Cognition & Problem Solving' | 'Gross & Fine Motor Skills' | 'Creative Expressive Arts'
export type ResourceFormat = 'Printable PDF / Worksheet' | 'Lesson Plan / Activity Guide' | 'Interactive Digital Game' | 'Video / Audio Resource' | 'Flashcards & Visual Cards'

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
