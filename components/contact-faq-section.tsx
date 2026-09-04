'use client'

import Image from 'next/image'
import { CheckCircle2, ChevronDown, Mail, MessageCircle, Minus, PencilLine, Plus, Send, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'

const roleOptions = ['Parent / Caregiver', 'Educator', 'Business Owner / Management', 'Activity & Venue Provider / Partner', 'Other'] as const
const inquiryOptions = ['General Inquiry', 'Resource Suggestion', 'Feedback', 'Partnership'] as const

const faqs = [
  {
    question: 'How does JoeyClub ensure all resources are child-safe?',
    answer: 'JoeyClub strictly filters results against verified Australian ECEC portals and government whitelists, eliminating inappropriate ads and content.',
  },
  {
    question: 'Are the resources aligned with EYLF 2.0?',
    answer: 'Yes! All resources on JoeyClub are tagged and aligned with the Early Years Learning Framework (EYLF 2.0) and NQS outcomes.',
  },
  {
    question: 'Is JoeyClub free for parents and educators?',
    answer: 'JoeyClub is currently 100% free while in its beta testing phase. Should we introduce any premium subscription tiers in the future, all registered users will receive advance notice before any changes take effect.',
  },
  {
    question: 'Can I suggest a new resource or venue?',
    answer: "Absolutely! Simply use the contact form on the left (or above on mobile) with the inquiry type 'Resource Suggestion' to submit your recommendations to our team.",
  },
  {
    question: 'How often are new resources added?',
    answer: 'JoeyClub regularly reviews and adds new learning ideas, community activities, and trusted resources as they become available.',
  },
  {
    question: 'Who is JoeyClub for?',
    answer: 'JoeyClub is designed for parents, carers, and early childhood educators looking for safe, practical ideas and trusted learning opportunities.',
  },
] as const

export function ContactFaqSection(): ReactElement {
  return (
    <>
      <section id="contact" className="relative scroll-mt-20 overflow-hidden bg-muted py-7 sm:py-10 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50%] bg-[length:auto_90%] bg-no-repeat lg:block"
          style={{
            backgroundImage: 'url(/illustrations/contact-kangaroo-family-unified-v27.png)',
            backgroundPosition: 'right -28px',
          }}
        />
        <div className="relative z-10 mx-auto w-full px-5 lg:w-[95%] lg:max-w-[1400px] lg:px-10">
          <div className="relative lg:min-h-[42rem]">
            <ContactForm />
          </div>
        </div>
      </section>

      <FaqSection />
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

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setConfirmation({ name: name.trim(), email: email.trim() })
  }

  return (
    <div className="relative min-w-0 lg:my-0 lg:ml-0 lg:w-[46%] lg:rounded-[22px] lg:bg-card lg:p-6 lg:shadow-[0_18px_42px_-28px_rgba(63,81,54,0.48)] xl:p-7">
      <Image src="/decor/contact-leaf-sparkles.png" alt="" width={112} height={84} className="pointer-events-none absolute -right-3 -top-3 h-auto w-20 object-contain opacity-95 lg:hidden" aria-hidden />
      <h2 className="pr-16 font-display text-[clamp(1.85rem,7vw,2.4rem)] font-bold leading-tight tracking-tight text-brand-dark lg:pr-0">Get in Touch</h2>
      <p className="mt-3 max-w-[36rem] text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">Have a question, feedback, or need specific resources? We&apos;d love to hear from you.</p>

      <form onSubmit={submit} className="mt-6 grid gap-3 lg:mt-5 lg:gap-2.5" aria-label="Contact JoeyClub">
        <TextField id="contact-name" label="Full Name / Business Name" value={name} onChange={setName} placeholder="e.g. Sarah Jenkins or Little Stars ECEC" icon={UserRound} autoComplete="name" />
        <TextField id="contact-email" label="Email Address" value={email} onChange={setEmail} placeholder="e.g. sarah@example.com" icon={Mail} type="email" autoComplete="email" />
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-2.5">
          <SelectField label="I am a..." value={role} options={roleOptions} onChange={setRole} icon={UserRound} />
          <SelectField label="Inquiry Type" value={inquiry} options={inquiryOptions} onChange={setInquiry} icon={MessageCircle} />
        </div>

        <label htmlFor="contact-message" className="block text-[0.82rem] font-bold text-brand-dark">
          <span>Message / Feedback</span>
          <span className="relative mt-1.5 block">
            <PencilLine className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-primary" aria-hidden />
            <textarea id="contact-message" required rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us a little more so we can help..." className="min-h-28 w-full resize-y rounded-2xl border border-primary/65 bg-card py-3 pl-10 pr-3.5 text-[0.88rem] font-medium leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:border-primary focus:ring-2 focus:ring-primary/15 lg:min-h-24" />
          </span>
        </label>

        <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[0.9rem] font-bold text-primary-foreground shadow-[0_12px_24px_-18px_rgba(63,81,54,0.8)] transition-colors hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-primary/30">
          <Send className="size-[1.05rem]" aria-hidden />
          Send Message
        </button>

        {confirmation && <div role="status" className="flex items-start gap-3 rounded-2xl border border-primary/35 bg-[#EDF3E8] p-4 text-sm leading-relaxed text-brand-dark"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><p><span className="font-bold">Thank you, {confirmation.name}!</span> We&apos;ve received your message. A confirmation email has been sent to {confirmation.email}, and our team will get back to you shortly.</p></div>}
      </form>
    </div>
  )
}

function TextField({ id, label, value, onChange, placeholder, icon: Icon, type = 'text', autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; icon: LucideIcon; type?: 'text' | 'email'; autoComplete?: string }): ReactElement {
  return (
    <label htmlFor={id} className="block text-[0.82rem] font-bold text-brand-dark">
      <span>{label}</span>
      <span className="relative mt-1.5 block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
        <input id={id} required type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-2xl border border-primary/65 bg-card pl-10 pr-3.5 text-[0.88rem] font-medium text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </span>
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
  const [activeIndex, setActiveIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 bg-background py-12 sm:py-16 lg:py-20">
      <div className="mx-auto w-full px-5 lg:w-[95%] lg:max-w-[1400px] lg:px-10">
        <div className="grid items-start gap-9 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <h2 className="font-display text-[clamp(1.85rem,5vw,2.5rem)] font-bold leading-tight tracking-tight text-brand-dark">Frequently Asked Questions</h2>
            <p className="mt-3 max-w-[32rem] text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">If you don&apos;t find the answer you are looking for, please feel free to use the Contact Us link above to reach out to us.</p>
            <Image src="/illustrations/faq-book-search-illustration-v1.png" alt="An open book with a friendly magnifying glass and question mark" width={1402} height={1122} className="mt-6 hidden h-auto w-full max-w-[25rem] object-contain lg:block" priority={false} />
          </div>

          <div className="min-w-0 space-y-2.5" role="list" aria-label="Frequently asked questions">
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
    </section>
  )
}
