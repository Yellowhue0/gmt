'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type User = { name: string; role: string; email: string }

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const { lang, setLang, t } = useLanguage()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => d.data && setUser(d.data))
      .catch(() => {})
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  const isStaff = user?.role === 'TRAINER' || user?.role === 'ADMIN'
  const isAdmin = user?.role === 'ADMIN'

  const navLinks = [
    { href: '/', label: t('nav_home') },
    { href: '/schema', label: t('nav_schedule') },
    { href: '/events', label: t('nav_events') },
    { href: '/community', label: t('nav_community') },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/glommenlogo.svg"
              alt="GLOMMEN MUAY THAI"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <span className="font-bold text-white tracking-widest hidden sm:block uppercase text-sm">
              GLOMMEN MUAY THAI
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-zinc-400 hover:text-white transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side: lang toggle + auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center rounded border border-zinc-700 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setLang('sv')}
                className={`px-2.5 py-1 transition-colors ${lang === 'sv' ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                SV
              </button>
              <div className="w-px bg-zinc-700 self-stretch" />
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 transition-colors ${lang === 'en' ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  {user.name}
                </Link>
                {isStaff && (
                  <Link href="/dashboard/trainer" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {t('nav_trainer_view')}
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/dashboard/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {t('nav_admin')}
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {t('nav_logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  {t('nav_login')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
                >
                  {t('nav_join')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile: lang toggle + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <div className="flex items-center rounded border border-zinc-700 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setLang('sv')}
                className={`px-2 py-1 transition-colors ${lang === 'sv' ? 'bg-brand text-white' : 'text-zinc-400'}`}
              >
                SV
              </button>
              <div className="w-px bg-zinc-700 self-stretch" />
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 transition-colors ${lang === 'en' ? 'bg-brand text-white' : 'text-zinc-400'}`}
              >
                EN
              </button>
            </div>
            <button
              onClick={() => setOpen(!open)}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="Meny"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-zinc-900 space-y-1 pt-3">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block px-2 py-2 text-zinc-300 hover:text-white text-sm"
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-zinc-900 space-y-1">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                    {t('nav_my_page')} – {user.name}
                  </Link>
                  {isStaff && (
                    <Link href="/dashboard/trainer" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                      {t('nav_trainer_view')}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/dashboard/admin" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                      {t('nav_admin')}
                    </Link>
                  )}
                  <button onClick={() => { logout(); setOpen(false) }} className="block w-full text-left px-2 py-2 text-zinc-500 hover:text-white text-sm">
                    {t('nav_logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                    {t('nav_login')}
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="block px-2 py-2 text-brand font-medium text-sm">
                    {t('nav_join')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
