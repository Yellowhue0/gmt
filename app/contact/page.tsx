'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

const DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=Glommens+Thaiboxningsklubb+Falkenberg+Sweden'
const MAP_EMBED_URL =
  'https://maps.google.com/maps?q=Glommens+Thaiboxningsklubb+Falkenberg+Sweden&t=&z=15&ie=UTF8&iwloc=&output=embed'

export default function ContactPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* Full-width map at top */}
      <div className="relative w-full border-b border-zinc-800" style={{ height: '420px' }}>
        <iframe
          src={MAP_EMBED_URL}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Glommens Thaiboxningsklubb – Falkenberg"
        />
        {/* Overlay gradient at bottom to blend into page */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-2">{t('contact_page_sub')}</p>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white uppercase tracking-wide"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            {t('contact_page_title')}
          </h1>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">

          {/* Address */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📍</span>
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest">{t('contact_address_label')}</h2>
            </div>
            <p className="text-white font-semibold text-sm">Glommens Thaiboxningsklubb</p>
            <p className="text-zinc-400 text-sm mt-1">{t('home_location_address')}</p>
          </div>

          {/* Website */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌐</span>
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest">{t('contact_website_label')}</h2>
            </div>
            <a
              href="http://www.thaibox.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-hover transition-colors font-semibold text-sm"
            >
              {t('home_location_website')}
            </a>
            <p className="text-zinc-600 text-xs mt-1">thaibox.se</p>
          </div>

          {/* Opening hours */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🕐</span>
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest">{t('contact_hours_title')}</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">{t('contact_hours_note')}</p>
            <Link
              href="/schema"
              className="text-brand hover:text-brand-hover text-sm mt-3 inline-block transition-colors"
            >
              {t('contact_schedule_link')} →
            </Link>
          </div>
        </div>

        {/* Get Directions CTA */}
        <div className="flex justify-center mb-12">
          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-brand hover:bg-brand-hover text-white font-bold text-sm uppercase tracking-widest rounded-lg transition-colors"
          >
            <span>📍</span>
            {t('home_location_directions')}
          </a>
        </div>

        {/* Social / links */}
        <div className="border-t border-zinc-800 pt-10">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <a
              href="https://www.facebook.com/groups/56806592563/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              {t('foot_facebook')}
            </a>
            <span className="text-zinc-800">·</span>
            <a
              href="https://www.instagram.com/glommensthaiboxning/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              @glommensthaiboxning
            </a>
            <span className="text-zinc-800">·</span>
            <a
              href="http://www.thaibox.se"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              thaibox.se
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
