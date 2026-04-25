import type { Metadata } from 'next'
import { Inter, Anton } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: {
    default: 'Glommens Muay Thai – Falkenberg',
    template: '%s | Glommens Muay Thai Falkenberg',
  },
  description:
    'Glommens Muay Thai (Glommens Thaiboxningsklubb) i Falkenberg. Thaiboxning och Muay Thai för alla nivåer – nybörjare, motionärer och tävlande. Välkommen att träna med oss i Falkenberg!',
  keywords: [
    'Glommens Muay Thai',
    'Glommens Thaiboxningsklubb',
    'Falkenberg Muay Thai',
    'Muay Thai Falkenberg',
    'Thaiboxning Falkenberg',
    'Kampsport Falkenberg',
    'Muay Thai Sweden',
    'Gym Falkenberg',
    'Thaibox Falkenberg',
    'thaibox.se',
  ],
  openGraph: {
    title: 'Glommens Muay Thai – Falkenberg',
    description:
      'Thaiboxning och Muay Thai i Falkenberg för alla nivåer. Nybörjare, motionärer och tävlande välkomna!',
    url: 'http://www.thaibox.se',
    siteName: 'Glommens Muay Thai',
    locale: 'sv_SE',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsClub',
  name: 'Glommens Thaiboxningsklubb',
  alternateName: 'Glommens Muay Thai',
  description:
    'Thaiboxning och Muay Thai i Falkenberg för alla nivåer – nybörjare, motionärer och tävlande välkomna.',
  url: 'http://www.thaibox.se',
  address: {
    '@type': 'PostalAddress',
    postalCode: '311 42',
    addressLocality: 'Falkenberg',
    addressCountry: 'SE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 56.9054,
    longitude: 12.4924,
  },
  sport: 'Muay Thai',
  sameAs: [
    'http://www.thaibox.se',
    'https://www.facebook.com/groups/56806592563/',
    'https://www.instagram.com/glommensthaiboxning/',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${inter.variable} ${anton.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white antialiased">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
