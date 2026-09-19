import Image from 'next/image'

export function AboutFounderSection() {
  return (
    <section id="about-founder" className="mx-auto w-full scroll-mt-20 px-5 py-10 sm:py-12 lg:w-[95%] lg:max-w-[1400px] lg:px-10 lg:py-14">
      <div className="rounded-[1.75rem] border border-primary/15 bg-muted p-7 shadow-[0_18px_42px_-30px_rgba(63,81,54,0.45)] sm:rounded-[2rem] sm:p-10 lg:aspect-[16/10] lg:p-10 xl:p-12">
        <div className="grid items-center gap-8 lg:h-full lg:grid-cols-[clamp(18.75rem,30vw,26rem)_clamp(26rem,36vw,34rem)] lg:justify-center lg:gap-[clamp(3rem,5vw,6rem)]">
        <div className="relative hidden aspect-[3/4] w-full overflow-hidden rounded-[0.85rem] bg-[#EEEDEA] lg:block">
          <Image
            src="/illustrations/founder-rita-zhao-hero-style-v7.png"
            alt="Rita Zhao, JoeyClub creator and early childhood educator, waving"
            fill
            sizes="(min-width: 1024px) 36vw, 100vw"
            className="object-cover object-center"
            priority={false}
          />
        </div>

        <div className="max-w-[34rem] py-1">
          <h2 className="font-display text-[clamp(1.85rem,5vw,2.5rem)] font-bold leading-tight tracking-tight text-brand-dark">About the Founder</h2>
          <div className="mt-8 space-y-4 text-[1rem] leading-relaxed text-muted-foreground sm:text-[1.08rem]">
            <p>Rita Zhao is an Australia-based registered ECT (Early Childhood Teacher) and a passionate advocate for coding and AI technology.</p>
            <p>Driven by her technical expertise and a deep love for early childhood education, Rita founded JoeyClub to create a safe, convenient, and resource-rich ECEC platform for children, educators, and parents alike. JoeyClub is currently focused on supporting the Australian early childhood community.</p>
            <p>Her goal is to empower Australian families and teachers to easily discover diverse, engaging, child-safe educational activities that inspire curious young minds.</p>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
