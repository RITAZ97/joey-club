import { getCreditBalance } from '@/lib/credits'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  return typeof value === 'string' ? value.trim() : ''
}

export async function publicUser(user: {
  id: string
  firstName: string
  lastName: string | null
  email: string
  occupation: 'teacher' | 'parent' | 'other' | null
  yearLevel: '0-3' | '3-5' | null
  country: string | null
  onboardingComplete: boolean
  emailVerifiedAt: Date | null
}) {
  const { emailVerifiedAt, ...rest } = user
  return { ...rest, emailVerified: emailVerifiedAt !== null, credits: await getCreditBalance(user.id) }
}
