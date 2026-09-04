import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { SafeIdeas } from '@/components/safe-ideas'
import { WhyJoeyClub } from '@/components/why-joeyclub'
import { EarlyYearsExplorer } from '@/components/early-years-explorer'
import { CommunityLearningAdventures } from '@/components/community-learning-adventures'
import { ResourceSearchProvider } from '@/components/resource-search-context'
import { SiteFooter } from '@/components/site-footer'
import { AuthProvider } from '@/components/auth-context'
import { ContactFaqSection } from '@/components/contact-faq-section'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <ResourceSearchProvider>
        <AuthProvider>
          <SiteHeader />
          <Hero />
          <SafeIdeas />
          <WhyJoeyClub />
          <EarlyYearsExplorer />
          <CommunityLearningAdventures />
          <ContactFaqSection />
          <SiteFooter />
        </AuthProvider>
      </ResourceSearchProvider>
    </main>
  )
}
