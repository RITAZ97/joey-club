'use client'

import { useSavedItems } from '@/components/saved-items'
import type { ReactElement } from 'react'

export function UnsaveConfirmationDialog(): ReactElement | null {
  const { pendingUnsaveActivity, confirmUnsaveActivity, dismissUnsaveActivity } = useSavedItems()

  if (!pendingUnsaveActivity) return null

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-brand-dark/30 p-4" role="dialog" aria-modal="true" aria-labelledby="unsave-confirmation-title">
    <div className="w-full max-w-md rounded-[1.75rem] border border-border bg-background p-6 shadow-2xl sm:p-7">
      <h2 id="unsave-confirmation-title" className="font-display text-[1.45rem] font-bold leading-snug text-brand-dark">Are you sure you want to unsave “{pendingUnsaveActivity.title}”?</h2>
      <div className="mt-7 flex justify-end gap-2.5">
        <button type="button" onClick={dismissUnsaveActivity} className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted">No</button>
        <button type="button" onClick={confirmUnsaveActivity} className="rounded-2xl bg-[#A85C4D] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#914C40]">Yes</button>
      </div>
    </div>
  </div>
}
