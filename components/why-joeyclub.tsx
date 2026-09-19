import Image from 'next/image'
import { BookOpenCheck, ShieldCheck, Sparkles } from 'lucide-react'

const features = [
  {
    icon: ShieldCheck,
    title: 'Safer than the open web',
    description:
      'Only verified, child-friendly Australian ECEC resources — no pop-ups, inappropriate content or uncertain sources.',
  },
  {
    icon: BookOpenCheck,
    title: 'EYLF 2.0 & NQS, already connected',
    description:
      'Every resource is tagged to learning outcomes and quality areas, making meaningful planning easier.',
  },
  {
    icon: Sparkles,
    title: 'Smart Filters & Custom Folders',
    description:
      'Smart filters adapt by age, resource type, and developmental stage. Submit web resources you love, build your own activities, and save it all into custom folders that fit your moment.',
  },
]

export function WhyJoeyClub() {
  return (
    <section id="why-joeyclub" className="mx-auto w-full scroll-mt-6 py-4 sm:py-6 lg:py-12">
      <div className="bg-muted px-5 py-7 sm:px-6 sm:py-10 lg:p-14">
        <div className="mx-auto grid w-full max-w-[1540px] items-start gap-8 lg:max-w-none lg:grid-cols-[5fr_4fr] lg:gap-12 lg:p-8">
          {/* Static safety illustration */}
          <div className="flex flex-col">
            <div className="relative w-full max-w-none aspect-[8/5] overflow-hidden rounded-3xl border border-border/80 bg-[#fffcfa]">
              <Image
                src="/illustrations/video.png"
                alt="Educator guiding children through a sensory sorting activity"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Copy */}
          <div className="flex min-w-0 flex-col">
            <p className="text-[0.76rem] font-bold uppercase tracking-[0.18em] text-primary sm:text-[0.82rem]">
              Why JoeyClub
            </p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.2vw,2.7rem)] font-bold leading-[1.1] tracking-tight text-brand-dark text-balance sm:mt-3">
              Safer discovery, made for early learning.
            </h2>

            <ul className="mt-6 space-y-5 sm:mt-7 sm:space-y-6 lg:space-y-7">
              {features.map((feature) => (
                <li key={feature.title} className="flex gap-3 sm:gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card sm:size-11">
                    <feature.icon
                      className="size-5 text-primary"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <div>
                    <h3 className="font-display text-[1rem] font-bold leading-tight text-brand-dark sm:text-[1.12rem] lg:text-[1.2rem]">
                      {feature.title}
                    </h3>
                    <p className="mt-1 max-w-none text-[0.88rem] leading-relaxed text-muted-foreground sm:text-[0.94rem]">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
