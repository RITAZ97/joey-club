import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import './globals.css'
import { SavedItemsProvider } from '@/components/saved-items'
import { SaveToFolderDialog } from '@/components/save-to-folder-dialog'
import { UnsaveConfirmationDialog } from '@/components/unsave-confirmation-dialog'

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-baloo',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: 'JoeyClub — Safe, verified learning resources for early years',
  description:
    '100% verified, child-friendly learning resources for Australian educators and parents. Search safe ideas aligned to EYLF 2.0 & NQS.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#7d9a6c',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${baloo.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased">
        <SavedItemsProvider>{children}<SaveToFolderDialog /><UnsaveConfirmationDialog /></SavedItemsProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
