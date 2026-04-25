'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-black border-t border-zinc-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/glommenlogo.svg" alt="GMT" className="w-10 h-10 object-contain" />
              <span className="font-bold text-white">GLOMMENS MUAY THAI</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {t('foot_about')}
            </p>
          </div>

          <div>
            <h3 className="text-brand font-semibold mb-3 text-sm uppercase tracking-wider">{t('foot_quicklinks')}</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/schema', label: t('foot_schedule') },
                { href: '/membership', label: t('nav_membership') },
                { href: '/events', label: t('foot_events') },
                { href: '/community', label: t('foot_community') },
                { href: '/contact', label: t('nav_contact') },
                { href: '/register', label: t('foot_join') },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-zinc-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-brand font-semibold mb-3 text-sm uppercase tracking-wider">{t('foot_contact')}</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a
                  href="http://www.thaibox.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  thaibox.se
                </a>
              </li>
              <li>{t('foot_location')}</li>
              <li>
                <a
                  href="https://www.facebook.com/groups/56806592563/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t('foot_facebook')}
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/glommensthaiboxning/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  @glommensthaiboxning
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-900 space-y-2 text-center">
          <p className="text-xs text-zinc-600">
            {t('foot_copyright').replace('{year}', String(new Date().getFullYear()))}
          </p>
          <p className="text-[10px] text-zinc-700 tracking-wide">
            {t('foot_seo')}
          </p>
        </div>
      </div>
    </footer>
  )
}
