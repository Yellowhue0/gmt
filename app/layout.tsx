import type { Metadata } from 'next'
import { Inter, Anton } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Glommens Muay Thai – Falkenberg',
  description:
    'Vi har thaiboxningsträning för dig som är nybörjare, har tränat Muay Thai tidigare, kanske vill tävla eller för dig som bara letar efter en bra och rolig motionsform.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${inter.variable} ${anton.variable} h-full`}>
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
