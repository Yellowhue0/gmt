'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Bell } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatRelative } from '@/lib/utils'

type User = { name: string; role: string; email: string }
type Notification = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string }

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const { lang, setLang, t } = useLanguage()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setUser(d.data)
          fetchNotifications()
        }
      })
      .catch(() => {})
  }, [])

  // Poll for new notifications every 30s
  useEffect(() => {
    if (!user) return
    const id = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(id)
  }, [user])

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.data ?? []))
      .catch(() => {})
  }

  const openBell = () => {
    setBellOpen(v => !v)
    if (!bellOpen && unreadCount > 0) {
      fetch('/api/notifications', { method: 'PATCH' }).then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      })
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  const isStaff = user?.role === 'TRAINER' || user?.role === 'ADMIN'
  const isAdmin = user?.role === 'ADMIN'
  const isFinance = user?.role === 'FINANCE' || user?.role === 'ADMIN'
  const unreadCount = notifications.filter(n => !n.read).length

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
              alt="GLOMMENS MUAY THAI"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <span className="font-bold text-white tracking-widest hidden sm:block uppercase text-sm">
              GLOMMENS MUAY THAI
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center rounded border border-zinc-700 overflow-hidden text-xs font-medium">
              <button onClick={() => setLang('sv')} className={`px-2.5 py-1 transition-colors ${lang === 'sv' ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'}`}>SV</button>
              <div className="w-px bg-zinc-700 self-stretch" />
              <button onClick={() => setLang('en')} className={`px-2.5 py-1 transition-colors ${lang === 'en' ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'}`}>EN</button>
            </div>

            {user ? (
              <>
                {/* Notification bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={openBell}
                    className="relative p-1.5 text-zinc-400 hover:text-white transition-colors"
                    aria-label={t('nav_notifications')}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {bellOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                        <span className="text-white text-sm font-semibold">{t('nav_notifications')}</span>
                      </div>
                      <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                        {notifications.length === 0 ? (
                          <li className="px-4 py-8 text-center text-zinc-600 text-sm">{t('nav_no_notifications')}</li>
                        ) : (
                          notifications.map(n => (
                            <li key={n.id} className={`px-4 py-3 transition-colors ${n.read ? '' : 'bg-brand/5'}`}>
                              <div className="flex items-start gap-2">
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />}
                                <div className={!n.read ? '' : 'pl-3.5'}>
                                  <p className="text-white text-xs font-medium">{n.title}</p>
                                  <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-zinc-700 text-[10px] mt-1">{formatRelative(n.createdAt)}</p>
                                </div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  {user.name}
                </Link>
                <Link href="/dashboard/profile" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  {t('nav_profile')}
                </Link>
                {isStaff && (
                  <Link href="/dashboard/trainer" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {t('nav_trainer_view')}
                  </Link>
                )}
                {isFinance && (
                  <Link href="/dashboard/finance" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {t('nav_finance')}
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/dashboard/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {t('nav_admin')}
                  </Link>
                )}
                <button onClick={logout} className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
                  {t('nav_logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">{t('nav_login')}</Link>
                <Link href="/register" className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors">{t('nav_join')}</Link>
              </>
            )}
          </div>

          {/* Mobile: lang toggle + bell + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <div className="flex items-center rounded border border-zinc-700 overflow-hidden text-xs font-medium">
              <button onClick={() => setLang('sv')} className={`px-2 py-1 transition-colors ${lang === 'sv' ? 'bg-brand text-white' : 'text-zinc-400'}`}>SV</button>
              <div className="w-px bg-zinc-700 self-stretch" />
              <button onClick={() => setLang('en')} className={`px-2 py-1 transition-colors ${lang === 'en' ? 'bg-brand text-white' : 'text-zinc-400'}`}>EN</button>
            </div>
            {user && (
              <button onClick={openBell} className="relative p-1.5 text-zinc-400 hover:text-white transition-colors">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setOpen(!open)} className="text-zinc-400 hover:text-white p-1" aria-label="Meny">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-zinc-900 space-y-1 pt-3">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-zinc-900 space-y-1">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                    {t('nav_my_page')} – {user.name}
                  </Link>
                  <Link href="/dashboard/profile" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                    {t('nav_profile')}
                  </Link>
                  {isStaff && (
                    <Link href="/dashboard/trainer" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                      {t('nav_trainer_view')}
                    </Link>
                  )}
                  {isFinance && (
                    <Link href="/dashboard/finance" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">
                      {t('nav_finance')}
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
                  <Link href="/login" onClick={() => setOpen(false)} className="block px-2 py-2 text-zinc-300 hover:text-white text-sm">{t('nav_login')}</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="block px-2 py-2 text-brand font-medium text-sm">{t('nav_join')}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
