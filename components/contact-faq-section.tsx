'use client'

import Image from 'next/image'
import { CheckCircle2, ChevronDown, ExternalLink, Mail, MessageCircle, Minus, PencilLine, Plus, Send, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'

const roleOptions = ['Parent / Caregiver', 'Educator', 'Business Owner / Management', 'Activity & Venue Provider / Partner', 'Other'] as const
const inquiryOptions = ['General Inquiry', 'Resource Suggestion', 'Feedback', 'Partnership'] as const

const faqs = [
  {
    question: 'How does JoeyClub ensure all resources are child-safe?',
    answer: 'JoeyClub strictly filters results against verified Australian ECEC portals and trusted industry whitelists, eliminating inappropriate ads and content.',
  },
  {
    question: 'Are the resources aligned with EYLF 2.0?',
    answer: <><strong>Yes.</strong> Most learning activities on JoeyClub are carefully tagged with EYLF 2.0 outcomes, so you can easily filter content that fits your curriculum plan.</>,
  },
  {
    question: 'Is JoeyClub free for parents and educators?',
    answer: 'JoeyClub is currently 100% free while in its beta testing phase. Should we introduce any premium subscription tiers in the future, all registered users will receive advance notice before any changes take effect.',
  },
  {
    question: 'Can I suggest a new resource or venue?',
    answer: <><strong>Absolutely!</strong> Simply use the Contact Us form below with the inquiry type <strong>&apos;Resource Suggestion&apos;</strong>. Please feel free to share specific activity links from child-friendly or trusted websites so our team can review and feature them.</>,
  },
  {
    question: 'How often are new resources added?',
    answer: 'New learning ideas, community activities, and trusted resources are reviewed and added weekly.',
  },
] as const

const safetyFeatures = [
  {
    title: 'Trusted & Whitelisted Resources',
    description: 'We strictly index and recommend recognised Australian ECEC sources, including Twinkl, ABC Kids, Raising Children Network, and more, helping prevent inappropriate external links.',
  },
  {
    title: 'AI & Human Dual-Layer Verification',
    description: 'AI checks and offline human review rules work together to screen out pop-up ads, payment prompts and unsuitable visual content.',
  },
  {
    title: 'Official eSafety Guidance Alignment',
    description: 'Our approach aligns with the eSafety Commissioner’s early-years guidance: Be Safe, Be Kind and Ask for Help—so families and educators can explore together with confidence.',
  },
] as const

export function ContactFaqSection(): ReactElement {
  return (
    <>
      <FaqSection />

      <section id="contact" className="relative scroll-mt-20 overflow-hidden bg-muted py-7 sm:py-10 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50%] bg-[length:auto_90%] bg-no-repeat lg:block"
          style={{
              backgroundImage: 'url(/illustrations/contact-kangaroo-family-unified-v38.png)',
            backgroundPosition: 'right -28px',
          }}
        />
        <div className="relative z-10 mx-auto w-full px-5 lg:w-[95%] lg:max-w-[1400px] lg:px-10">
          <div className="relative lg:min-h-[42rem]">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  )
}

function ContactForm(): ReactElement {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<(typeof roleOptions)[number]>('Parent / Caregiver')
  const [inquiry, setInquiry] = useState<(typeof inquiryOptions)[number]>('General Inquiry')
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState<{ name: string; email: string } | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; message?: string }>({})
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!confirmation) return
    const timeout = window.setTimeout(() => setConfirmation(null), 10_000)
    return () => window.clearTimeout(timeout)
  }, [confirmation])

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setConfirmation(null)
    setError('')
    const nextFieldErrors: { email?: string; message?: string } = {}
    if (!email.trim()) nextFieldErrors.email = 'Email Address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextFieldErrors.email = 'Please provide a valid email address.'
    if (!message.trim()) nextFieldErrors.message = 'Message / Feedback is required.'
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length) return
    setSending(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, inquiry, message }),
      })
      const body = await response.json()
      if (!response.ok) {
        setFieldErrors(body.fieldErrors || {})
        throw new Error(body.error || 'We could not send your message.')
      }
      setConfirmation({ name: name.trim(), email: email.trim() })
      setMessage('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not send your message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative min-w-0 lg:my-0 lg:ml-0 lg:w-[46%] lg:rounded-[22px] lg:bg-card lg:p-6 lg:shadow-[0_18px_42px_-28px_rgba(63,81,54,0.48)] xl:p-7">
      <Image src="/decor/contact-leaf-sparkles.png" alt="" width={112} height={84} className="pointer-events-none absolute -right-3 -top-3 h-auto w-20 object-contain opacity-95 lg:hidden" aria-hidden />
      <h2 className="pr-16 font-display text-[clamp(1.85rem,7vw,2.4rem)] font-bold leading-tight tracking-tight text-brand-dark lg:pr-0">Get in Touch</h2>
      <p className="mt-3 max-w-[40rem] text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">Have a question, feedback, or need tailored resources? Fill out the form below for the quickest response from our dedicated team, or email us directly at <a href="mailto:info@joeyclub.com.au" className="font-bold text-primary underline decoration-primary/45 underline-offset-2 transition-colors hover:text-brand-dark">info@joeyclub.com.au</a>.</p>

      <form noValidate onSubmit={submit} className="mt-6 grid gap-3 lg:mt-5 lg:gap-2.5" aria-label="Contact JoeyClub">
        <TextField id="contact-name" label="Full Name / Business Name" value={name} onChange={setName} placeholder="e.g. Sarah Jenkins or Little Stars ECEC" icon={UserRound} autoComplete="name" />
        <TextField id="contact-email" label="Email Address" value={email} onChange={(value) => { setEmail(value); setFieldErrors((current) => ({ ...current, email: undefined })) }} placeholder="e.g. sarah@example.com" icon={Mail} type="email" autoComplete="email" required error={fieldErrors.email} />
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-2.5">
          <SelectField label="I am a..." value={role} options={roleOptions} onChange={setRole} icon={UserRound} />
          <SelectField label="Inquiry Type" value={inquiry} options={inquiryOptions} onChange={setInquiry} icon={MessageCircle} />
        </div>

        <label htmlFor="contact-message" className="block text-[0.82rem] font-bold text-brand-dark">
          <span>Message / Feedback</span>
          <span className="relative mt-1.5 block">
            <PencilLine className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-primary" aria-hidden />
            <textarea id="contact-message" required aria-invalid={Boolean(fieldErrors.message)} value={message} onChange={(event) => { setMessage(event.target.value); setFieldErrors((current) => ({ ...current, message: undefined })) }} rows={4} placeholder="Tell us a little more so we can help..." className={`min-h-28 w-full resize-y rounded-2xl border bg-card py-3 pl-10 pr-3.5 text-[0.88rem] font-medium leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:ring-2 lg:min-h-24 ${fieldErrors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-primary/65 focus:border-primary focus:ring-primary/15'}`} />
          </span>
          {fieldErrors.message && <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.message}</p>}
        </label>

        <button type="submit" disabled={sending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-bold text-primary-foreground shadow-[0_12px_24px_-18px_rgba(63,81,54,0.8)] transition-colors hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-65">
          <Send className="size-[1.05rem]" aria-hidden />
          {sending ? 'Sending…' : 'Send Message'}
        </button>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">{error}</div>}
        {confirmation && <div role="status" className="flex items-start gap-3 rounded-2xl border border-primary/35 bg-[#EDF3E8] p-4 text-sm leading-relaxed text-brand-dark"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><p><span className="font-bold">Thank you!</span> We&apos;ve received your message and will get back to you as soon as possible.</p></div>}
      </form>
    </div>
  )
}

function TextField({ id, label, value, onChange, placeholder, icon: Icon, type = 'text', autoComplete, required = false, error }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; icon: LucideIcon; type?: 'text' | 'email'; autoComplete?: string; required?: boolean; error?: string }): ReactElement {
  return (
    <label htmlFor={id} className="block text-[0.82rem] font-bold text-brand-dark">
      <span>{label}</span>
      <span className="relative mt-1.5 block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
        <input id={id} required={required} aria-invalid={Boolean(error)} type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-11 w-full rounded-2xl border bg-card pl-10 pr-3.5 text-[0.88rem] font-medium text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:ring-2 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-primary/65 focus:border-primary focus:ring-primary/15'}`} />
      </span>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
}

function SelectField<T extends string>({ label, value, options, onChange, icon: Icon }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void; icon: LucideIcon }): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="text-[0.82rem] font-bold text-brand-dark">
      <span>{label}</span>
      <div ref={ref} className="relative mt-1.5">
        <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} className="flex h-11 w-full items-center gap-2.5 rounded-2xl border border-primary/65 bg-card pl-3.5 pr-3.5 text-left text-[0.88rem] font-medium text-foreground outline-none transition hover:bg-muted/45 focus:border-primary focus:ring-2 focus:ring-primary/15">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{value}</span>
          <ChevronDown className={`size-4 shrink-0 text-brand-dark transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {open && <div role="listbox" className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{options.map((option) => <button key={option} type="button" role="option" aria-selected={option === value} onClick={() => { onChange(option); setOpen(false) }} className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[#EDF3E8] ${option === value ? 'bg-[#DCE8D2] text-brand-dark' : 'text-foreground'}`}>{option}</button>)}</div>}
      </div>
    </div>
  )
}

function FaqSection(): ReactElement {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="scroll-mt-20 bg-background py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full px-5 lg:w-[95%] lg:max-w-[1400px] lg:px-10">
        <div className="grid items-start gap-10 lg:min-h-[33rem] lg:grid-cols-2 lg:items-stretch lg:gap-[clamp(3rem,9vw,11rem)]">
          <aside className="min-w-0 py-1 lg:py-3" aria-labelledby="esafety-title">
            <h2 id="esafety-title" className="font-display text-[clamp(1.85rem,5vw,2.5rem)] font-bold leading-tight tracking-tight text-brand-dark">Committed to Australian eSafety Standards</h2>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted-foreground sm:text-[0.98rem]">At JoeyClub, we closely align our digital safety standards with the Australian Government eSafety Commissioner guidelines to ensure a 100% child-safe exploration environment for educators and families.</p>

            <ul className="mt-7 space-y-5" aria-label="JoeyClub safety commitments">
              {safetyFeatures.map((feature) => <li key={feature.title} className="flex gap-3.5"><span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EDF3E8] text-primary"><CheckCircle2 className="size-4" aria-hidden /></span><div><h3 className="text-[0.98rem] font-bold leading-snug text-brand-dark">{feature.title}</h3><p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted-foreground">{feature.description}</p></div></li>)}
            </ul>

            <a href="https://www.esafety.gov.au/" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-center text-[0.86rem] font-bold text-primary-foreground shadow-[0_12px_24px_-18px_rgba(63,81,54,0.8)] transition-colors hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-primary/30">Visit eSafety Commissioner (esafety.gov.au)<ExternalLink className="size-4 shrink-0" aria-hidden /></a>
          </aside>

          <div className="min-w-0 lg:py-3">
            <header className="mb-5 lg:mb-6">
              <h2 className="font-display text-[clamp(1.85rem,5vw,2.5rem)] font-bold leading-tight tracking-tight text-brand-dark">Frequently Asked Questions</h2>
              <p className="mt-3 max-w-[38rem] text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">If you don&apos;t find the answer you are looking for, please feel free to use the Contact Us link above to reach out to us.</p>
            </header>
            <div className="space-y-4" role="list" aria-label="Frequently asked questions">
              {faqs.map((faq, index) => {
                const active = activeIndex === index
                const panelId = `faq-panel-${index}`
                return <article key={faq.question} className={`overflow-hidden border bg-card transition-colors ${active ? 'rounded-[1.75rem] border-primary/55' : 'rounded-full border-border hover:border-primary/40'}`}>
                  <h3>
                    <button type="button" onClick={() => setActiveIndex(active ? null : index)} aria-expanded={active} aria-controls={panelId} className="flex w-full items-center gap-3 px-5 py-2.5 text-left font-display text-[0.95rem] font-bold leading-snug text-brand-dark sm:px-6 sm:text-base">
                      <span className="min-w-0 flex-1">{faq.question}</span>
                      <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/70 bg-card text-brand-dark'}`}>{active ? <Minus className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}</span>
                    </button>
                  </h3>
                  <div id={panelId} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden"><p className="px-5 pb-4 text-sm leading-6 text-muted-foreground sm:px-6">{faq.answer}</p></div>
                  </div>
                </article>
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
