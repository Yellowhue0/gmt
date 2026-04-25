'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Menu, X, Bell, LogOut,
  User as UserIcon, BarChart2, Settings, Swords,
  Users, Calendar, ClipboardList, DollarSign, TrendingUp,
  FileText, Trophy,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatRelative } from '@/lib/utils'

type UserData = { name: string; role: string; email: string }
type Notification = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string }
type NavItem = { href: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const ROLE_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  FIGHTER: { border: 'border-red-500',    bg: 'bg-red-500/15',    text: 'text-red-200',    badge: 'Fighter' },
  TRAINER: { border: 'border-blue-500',   bg: 'bg-blue-500/15',   text: 'text-blue-200',   badge: 'Trainer' },
  ADMIN:   { border: 'border-yellow-400', bg: 'bg-yellow-400/15', text: 'text-yellow-200', badge: 'Admin' },
  FINANCE: { border: 'border-purple-500', bg: 'bg-purple-500/15', text: 'text-purple-200', badge: 'Finance' },
}
const DEFAULT_STYLE = { border: 'border-zinc-600', bg: 'bg-zinc-700/50', text: 'text-zinc-200', badge: 'Member' }

function roleStyle(role: string) {
  return ROLE_STYLES[role] ?? DEFAULT_STYLE
}

// Returns grouped sections of links — each group is separated by a divider
function getDropdownSections(role: string): NavItem[][] {
  const profile: NavItem = { href: '/dashboard/profile', icon: UserIcon, label: 'My Profile' }
  const training: NavItem = { href: '/dashboard', icon: BarChart2, label: 'Training History' }
  const settings: NavItem = { href: '/dashboard/profile', icon: Settings, label: 'Settings' }

  switch (role) {
    case 'FIGHTER':
      return [[
        profile,
        { href: '/dashboard/fighter/profile', icon: Swords,  label: 'My Fight Record' },
        training,
        settings,
      ]]

    case 'TRAINER':
      return [
        [profile, training],
        [
          { href: '/dashboard/trainer',        icon: Users,         label: 'Member Management' },
          { href: '/dashboard/trainer',        icon: Calendar,      label: 'Session Management' },
          { href: '/dashboard/trainer',        icon: ClipboardList, label: 'Check-in Register' },
          { href: '/dashboard/admin/fighters', icon: Swords,        label: 'Fighters Group' },
          settings,
        ],
      ]

    case 'FINANCE':
      return [
        [profile],
        [
          { href: '/dashboard/finance', icon: DollarSign, label: 'Payments & Members' },
          { href: '/dashboard/finance', icon: TrendingUp,  label: 'Attendance Reports' },
          settings,
        ],
      ]

    case 'ADMIN':
      return [
        [profile],
        [
          { href: '/dashboard/admin',           icon: Users,         label: 'Member Management' },
          { href: '/dashboard/trainer',         icon: Calendar,      label: 'Session Management' },
          { href: '/dashboard/admin/fighters',  icon: Swords,        label: 'Fighters Group' },
          { href: '/dashboard/trainer',         icon: ClipboardList, label: 'Check-in Register' },
          { href: '/dashboard/admin/seasons',   icon: Trophy,        label: 'Season Management' },
          { href: '/dashboard/admin/audit-log', icon: FileText,      label: 'Audit Log' },
          { href: '/dashboard/finance',         icon: DollarSign,    label: 'Finance & Payments' },
          settings,
        ],
      ]

    default: // MEMBER, JUNIOR, PARENT
      return [[profile, training, settings]]
  }
}

export default function Navbar() {
  const [user, setUser] = useState<UserData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.data) { setUser(d.data); fetchNotifications() }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    const id = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(id)
  }, [user])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.data ?? []))
      .catch(() => {})
  }

  const openBell = () => {
    setBellOpen(v => !v)
    setDropdownOpen(false)
    if (!bellOpen && unreadCount > 0) {
      fetch('/api/notifications', { method: 'PATCH' }).then(() =>
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      )
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const rs = user ? roleStyle(user.role) : DEFAULT_STYLE
  const sections = user ? getDropdownSections(user.role) : []

  const publicLinks = [
    { href: '/schema',     label: t('nav_schedule') },
    { href: '/events',     label: t('nav_events') },
    { href: '/community',  label: t('nav_community') },
    { href: '/membership', label: t('nav_membership') },
    { href: '/contact',    label: t('nav_contact') },
  ]

  const centerLinks = [
    ...publicLinks,
    ...(user ? [{ href: '/leaderboard', label: 'Leaderboard 🏆' }] : []),
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-6">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image src="/glommenlogo.svg" alt="GMT" width={36} height={36} className="object-contain" priority />
              <span className="font-bold text-white tracking-widest hidden lg:block uppercase text-sm leading-none">
                GLOMMENS<br />
                <span className="text-[10px] font-medium tracking-[0.2em] text-zinc-400">MUAY THAI</span>
              </span>
            </Link>

            {/* Center nav — grows to fill space */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {centerLinks.map(({ href, label }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">

              {/* Language toggle — hidden on very small screens */}
              <div className="hidden sm:flex items-center rounded border border-zinc-700 overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => setLang('sv')}
                  className={`px-2.5 py-1.5 transition-colors ${lang === 'sv' ? 'bg-brand text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  SV
                </button>
                <div className="w-px bg-zinc-700 self-stretch" />
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1.5 transition-colors ${lang === 'en' ? 'bg-brand text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  EN
                </button>
              </div>

              {user ? (
                <>
                  {/* Notification bell */}
                  <div ref={bellRef} className="relative">
                    <button
                      onClick={openBell}
                      className="relative p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800/60 transition-colors"
                      aria-label={t('nav_notifications')}
                    >
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {bellOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-zinc-800">
                          <span className="text-white text-sm font-semibold">{t('nav_notifications')}</span>
                        </div>
                        <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                          {notifications.length === 0 ? (
                            <li className="px-4 py-8 text-center text-zinc-600 text-sm">{t('nav_no_notifications')}</li>
                          ) : notifications.map(n => (
                            <li key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-brand/5'}`}>
                              <div className="flex items-start gap-2">
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />}
                                <div className={!n.read ? '' : 'pl-3.5'}>
                                  <p className="text-white text-xs font-medium">{n.title}</p>
                                  <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-zinc-700 text-[10px] mt-1">{formatRelative(n.createdAt)}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Avatar + profile dropdown */}
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => { setDropdownOpen(v => !v); setBellOpen(false) }}
                      aria-label="Profile menu"
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all hover:scale-105 ${rs.border} ${rs.bg} ${rs.text}`}
                    >
                      {getInitials(user.name)}
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-zinc-800">
                          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{rs.badge}</p>
                        </div>

                        {/* Role-based sections, separated by dividers */}
                        {sections.map((section, si) => (
                          <div key={si} className={si > 0 ? 'border-t border-zinc-800' : ''}>
                            {section.map(({ href, icon: Icon, label }) => (
                              <Link
                                key={`${si}-${label}`}
                                href={href}
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors"
                              >
                                <Icon size={14} className="text-zinc-500 shrink-0" />
                                {label}
                              </Link>
                            ))}
                          </div>
                        ))}

                        {/* Logout */}
                        <div className="border-t border-zinc-800">
                          <button
                            onClick={() => { logout(); setDropdownOpen(false) }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                          >
                            <LogOut size={14} className="shrink-0" />
                            {t('nav_logout')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2">
                    {t('nav_login')}
                  </Link>
                  <Link href="/register" className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-md transition-colors">
                    {t('nav_join')}
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-zinc-800/60"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile drawer — slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-zinc-950 border-l border-zinc-800 z-50 md:hidden flex flex-col transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          {user ? (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${rs.border} ${rs.bg} ${rs.text}`}>
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-zinc-500">{rs.badge}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm font-semibold text-white">Menu</span>
          )}
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-md shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto py-2">

          {/* Language toggle */}
          <div className="px-4 py-3 border-b border-zinc-800/60">
            <div className="flex items-center rounded border border-zinc-700 overflow-hidden text-xs font-semibold w-fit">
              <button onClick={() => setLang('sv')} className={`px-3 py-1.5 transition-colors ${lang === 'sv' ? 'bg-brand text-white' : 'text-zinc-500 hover:text-white'}`}>SV</button>
              <div className="w-px bg-zinc-700 self-stretch" />
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 transition-colors ${lang === 'en' ? 'bg-brand text-white' : 'text-zinc-500 hover:text-white'}`}>EN</button>
            </div>
          </div>

          {/* Site navigation */}
          <div className="px-3 pt-4 pb-2">
            <p className="px-3 mb-1 text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
              {lang === 'sv' ? 'Navigera' : 'Navigate'}
            </p>
            {centerLinks.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Account / role links */}
          {user && sections.length > 0 && (
            <div className="px-3 pt-4 pb-2 border-t border-zinc-800/60 mt-2">
              <p className="px-3 mb-1 text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                {lang === 'sv' ? 'Konto' : 'Account'}
              </p>
              {sections.map((section, si) => (
                <div key={si} className={si > 0 ? 'mt-1 pt-1 border-t border-zinc-800/40' : ''}>
                  {section.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={`${si}-${label}`}
                      href={href}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors"
                    >
                      <Icon size={15} className="text-zinc-500 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Guest links */}
          {!user && (
            <div className="px-4 pt-4 border-t border-zinc-800/60 mt-2 space-y-1">
              <Link href="/login" onClick={() => setDrawerOpen(false)} className="block px-3 py-2.5 text-sm text-zinc-300 hover:text-white transition-colors rounded-md hover:bg-zinc-800/50">
                {t('nav_login')}
              </Link>
              <Link href="/register" onClick={() => setDrawerOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-brand hover:text-brand-hover transition-colors rounded-md hover:bg-zinc-800/50">
                {t('nav_join')}
              </Link>
            </div>
          )}
        </div>

        {/* Drawer footer — logout pinned at bottom */}
        {user && (
          <div className="border-t border-zinc-800 px-3 py-3">
            <button
              onClick={() => { logout(); setDrawerOpen(false) }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={15} />
              {t('nav_logout')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
