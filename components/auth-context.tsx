'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'

export type AuthMode = 'login' | 'signup'
export type Occupation = 'teacher' | 'parent' | 'other'
export type YearLevel = '0-3' | '3-5'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string | null
  email: string
  occupation: Occupation | null
  yearLevel: YearLevel | null
  country: string | null
  onboardingComplete: boolean
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface OnboardingInput {
  occupation: Occupation
  yearLevel: YearLevel
  stateTerritory: string
  country: string
}

interface AuthResponse {
  user?: AuthUser
  error?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  register: (input: RegisterInput) => Promise<AuthUser>
  login: (input: LoginInput) => Promise<AuthUser>
  completeOnboarding: (input: OnboardingInput) => Promise<AuthUser>
  skipOnboarding: () => Promise<AuthUser>
  requestPasswordReset: (email: string) => Promise<void>
  logout: () => Promise<void>
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function requestAuth(path: string, body?: object): Promise<AuthResponse> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload = await response.json() as AuthResponse
  if (!response.ok) throw new Error(payload.error ?? 'Something went wrong. Please try again.')
  return payload
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let isCurrent = true
    void requestAuth('/api/auth/session')
      .then((payload) => { if (isCurrent) setUser(payload.user ?? null) })
      .catch(() => { if (isCurrent) setUser(null) })
      .finally(() => { if (isCurrent) setIsLoading(false) })
    return () => { isCurrent = false }
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<AuthUser> => {
    const payload = await requestAuth('/api/auth/register', input)
    if (!payload.user) throw new Error('We could not create your account. Please try again.')
    setUser(payload.user)
    return payload.user
  }, [])

  const login = useCallback(async (input: LoginInput): Promise<AuthUser> => {
    const payload = await requestAuth('/api/auth/login', input)
    if (!payload.user) throw new Error('We could not log you in. Please try again.')
    setUser(payload.user)
    return payload.user
  }, [])

  const completeOnboarding = useCallback(async (input: OnboardingInput): Promise<AuthUser> => {
    const payload = await requestAuth('/api/auth/onboarding', input)
    if (!payload.user) throw new Error('We could not save your profile. Please try again.')
    setUser(payload.user)
    return payload.user
  }, [])

  const skipOnboarding = useCallback(async (): Promise<AuthUser> => {
    const payload = await requestAuth('/api/auth/onboarding', { skip: true })
    if (!payload.user) throw new Error('We could not finish onboarding. Please try again.')
    setUser(payload.user)
    return payload.user
  }, [])

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    await requestAuth('/api/auth/password-reset/request', { email })
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await requestAuth('/api/auth/logout', {})
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, register, login, completeOnboarding, skipOnboarding, requestPasswordReset, logout }),
    [completeOnboarding, isLoading, login, logout, register, requestPasswordReset, skipOnboarding, user],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth must be used within AuthProvider')
  return context
}
