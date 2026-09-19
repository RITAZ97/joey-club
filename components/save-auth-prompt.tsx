'use client'

import type { ReactElement } from 'react'
import { AuthModal } from '@/components/auth-modal'
import { useSavedItems } from '@/components/saved-items'

/** Guests can browse everything, but saving to My Folders needs an account. */
export function SaveAuthPrompt(): ReactElement | null {
  const { authPromptOpen, dismissAuthPrompt } = useSavedItems()
  if (!authPromptOpen) return null
  return <AuthModal initialMode="login" onClose={dismissAuthPrompt} />
}
