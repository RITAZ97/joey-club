import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getCurrentUser, type Occupation, type YearLevel } from '@/lib/auth/session'
import { isRecord, publicUser, readString } from '@/lib/auth/validation'
import { getDb } from '@/lib/db'
import { userAccounts } from '@/lib/db/schema'

const occupations: readonly Occupation[] = ['teacher', 'parent', 'other']
const yearLevels: readonly YearLevel[] = ['0-3', '3-5']
const australianLocations = ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia', 'Out of Australia'] as const

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Please log in to complete onboarding.' }, { status: 401 })

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Please complete all onboarding fields.' }, { status: 400 })
  }
  if (!isRecord(payload)) return NextResponse.json({ error: 'Please complete all onboarding fields.' }, { status: 400 })

  const skip = payload.skip === true
  if (skip) {
    const [user] = await getDb()
      .update(userAccounts)
      .set({ onboardingComplete: true, updatedAt: new Date() })
      .where(eq(userAccounts.id, currentUser.id))
      .returning({
        id: userAccounts.id,
        firstName: userAccounts.firstName,
        lastName: userAccounts.lastName,
        email: userAccounts.email,
        occupation: userAccounts.occupation,
        yearLevel: userAccounts.yearLevel,
        country: userAccounts.country,
        onboardingComplete: userAccounts.onboardingComplete,
      })
    if (!user) return NextResponse.json({ error: 'We could not save your profile.' }, { status: 500 })
    return NextResponse.json({ user: publicUser(user) })
  }

  const occupation = readString(payload, 'occupation') as Occupation
  const yearLevel = readString(payload, 'yearLevel') as YearLevel
  const stateTerritory = readString(payload, 'stateTerritory')
  const country = readString(payload, 'country')
  if (!occupations.includes(occupation) || !yearLevels.includes(yearLevel) || !australianLocations.includes(stateTerritory as (typeof australianLocations)[number])) {
    return NextResponse.json({ error: 'Choose your occupation, year level and state or territory.' }, { status: 400 })
  }

  const [user] = await getDb()
    .update(userAccounts)
    .set({ occupation, yearLevel, stateTerritory, country: country || null, onboardingComplete: true, updatedAt: new Date() })
    .where(eq(userAccounts.id, currentUser.id))
    .returning({
      id: userAccounts.id,
      firstName: userAccounts.firstName,
      lastName: userAccounts.lastName,
      email: userAccounts.email,
      occupation: userAccounts.occupation,
      yearLevel: userAccounts.yearLevel,
      country: userAccounts.country,
      onboardingComplete: userAccounts.onboardingComplete,
    })
  if (!user) return NextResponse.json({ error: 'We could not save your profile.' }, { status: 500 })
  return NextResponse.json({ user: publicUser(user) })
}
