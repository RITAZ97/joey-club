import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { SafeIdeas } from '@/components/safe-ideas'
import { WhyJoeyClub } from '@/components/why-joeyclub'
import { EarlyYearsExplorer } from '@/components/early-years-explorer'
import { CommunityLearningAdventures } from '@/components/community-learning-adventures'
import { ResourceSearchProvider } from '@/components/resource-search-context'
import { SiteFooter } from '@/components/site-footer'
import { ContactFaqSection } from '@/components/contact-faq-section'
import { AboutFounderSection } from '@/components/about-founder-section'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <ResourceSearchProvider>
        <SiteHeader />
        <Hero />
        <SafeIdeas />
        <WhyJoeyClub />
        <EarlyYearsExplorer />
        <CommunityLearningAdventures />
        <AboutFounderSection />
        <ContactFaqSection />
        <SiteFooter />
      </ResourceSearchProvider>
    </main>
  )
}
