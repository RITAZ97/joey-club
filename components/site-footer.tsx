import type { ReactElement } from 'react'

export function SiteFooter(): ReactElement {
  return (
    <footer id="about" className="mt-10 border-t border-border">
      <section aria-labelledby="acknowledgement-heading" className="bg-[#EEEDEA]">
        <div className="mx-auto w-[95%] max-w-[1120px] px-4 py-6 sm:px-5 sm:py-7 lg:px-10">
          <div className="mx-auto max-w-[900px] text-center">
            <h2 id="acknowledgement-heading" className="font-display text-[1.15rem] font-bold text-brand-dark">Acknowledgement of Country</h2>
            <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">
              JoeyClub acknowledges the Traditional Custodians of the lands and waters across Australia. We pay respect to Aboriginal and Torres Strait Islander Peoples, their Elders past and present, and honour their enduring cultures, knowledge and connection to Country.
            </p>
          </div>
        </div>
      </section>
      <p className="px-5 py-5 text-center text-[0.8rem] leading-relaxed text-muted-foreground">
        © 2026 JoeyClub. All rights reserved. Designed by Rita Zhao
      </p>
    </footer>
  )
}
