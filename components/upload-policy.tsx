import Link from 'next/link'
import { X } from 'lucide-react'
import type { ReactElement } from 'react'

export function UploadPolicy(): ReactElement {
  return <main className="min-h-screen bg-background">
    <Link href="/folders" className="fixed right-5 top-5 z-10 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-brand-dark shadow-sm hover:bg-muted sm:right-8 sm:top-7" aria-label="Back to My Folders"><X className="size-5" /></Link>
    <article className="mx-auto w-full max-w-2xl px-5 pb-16 pt-20 sm:px-8 sm:pt-24">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">My Folders</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand-dark">Uploaded file guidelines</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A short, plain-language explanation of how attaching a photo or PDF to your own cards works, and what we ask of you when you use it.</p>

      <Section title="Where your files actually go">
        Files you attach to a card are saved only in this browser, on this device — never uploaded to JoeyClub&rsquo;s servers. No one else, including the JoeyClub team, can see or access them. That also means they won&rsquo;t follow you to another device or browser, and clearing your browser data will remove them.
      </Section>

      <Section title="What you can upload">
        Only attach files you own or have permission to share, and keep them appropriate for an early-childhood education setting — the same standard you&rsquo;d apply to anything shared with a classroom or family group. Don&rsquo;t attach anything illegal, harmful, or unsafe for children.
      </Section>

      <Section title="You're responsible for what you attach">
        Because these files live in your own browser and JoeyClub never sees them, you're the only one who can review or remove them. Attaching a file to a card means you take responsibility for its content and for having the right to use it.
      </Section>

      <Section title="Size limits">
        To keep your browser's storage from filling up, each file is capped at 4MB, and each card can hold up to 10MB of attachments in total. If a card is at its limit, remove a file before adding another.
      </Section>

      <Section title="Questions or concerns">
        If you're ever unsure whether something is appropriate to attach, leave it out — or reach out to us via the contact section on the JoeyClub homepage.
      </Section>
    </article>
  </main>
}

function Section({ title, children }: { title: string; children: ReactElement | string }): ReactElement {
  return <section className="mt-7"><h2 className="font-display text-lg font-bold text-brand-dark">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p></section>
}
