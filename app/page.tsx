'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Users, Trophy, MessageCircle, ChevronRight, Clock, Star } from 'lucide-react'
import { getSessionTypeLabel, formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { WeekScheduleWidget } from '@/components/WeekScheduleWidget'

type Trainer = { id: string; name: string }

type Session = {
  id: string
  name: string
  startTime: string
  endTime: string
  type: string
  dayOfWeek: number
  date: string | null
  isToday: boolean
  checkedIn: boolean
  checkInCount: number
  maxCapacity: number
  isCancelled: boolean
  isRecurring: boolean
  trainers: Trainer[]
}

type Event = {
  id: string
  title: string
  date: string
  location: string | null
  type: string
}

type LeaderboardEntry = { rank: number; name: string; points: number; role: string }
type LeaderboardPreview = { season: { name: string } | null; entries: LeaderboardEntry[] }

const TYPE_COLORS: Record<string, string> = {
  regular: 'bg-zinc-700 text-zinc-300',
  sparring: 'bg-brand/20 text-brand border border-brand/30',
  yoga: 'bg-purple-900/30 text-purple-300',
  youth: 'bg-blue-900/30 text-blue-300',
  conditioning: 'bg-orange-900/30 text-orange-300',
  girls: 'bg-pink-900/30 text-pink-300',
}

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardPreview | null>(null)
  const { lang, t } = useLanguage()

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.data) {
        setUser(d.data)
        fetch('/api/leaderboard').then(r => r.json()).then(lb => {
          if (lb.data) {
            setLeaderboard({
              season: lb.data.season,
              entries: (lb.data.entries ?? []).slice(0, 3),
            })
          }
        }).catch(() => {})
      }
    })
    fetch('/api/sessions').then(r => r.json()).then(d => setSessions(d.data ?? []))
    fetch('/api/events').then(r => r.json()).then(d => setEvents((d.data ?? []).slice(0, 3)))
  }, [])

  const todaySessions = sessions.filter(s => s.isToday)

  const stats = [
    { label: t('home_stat_members'), value: '60+' },
    { label: t('home_stat_sessions'), value: '9' },
    { label: t('home_stat_founded'), value: '2010' },
  ]

  const features = [
    { icon: <Calendar size={24} />, title: t('home_feat_schedule_title'), desc: t('home_feat_schedule_desc'), href: '/schema' },
    { icon: <Trophy size={24} />, title: t('home_feat_events_title'), desc: t('home_feat_events_desc'), href: '/events' },
    { icon: <MessageCircle size={24} />, title: t('home_feat_community_title'), desc: t('home_feat_community_desc'), href: '/community' },
    { icon: <Users size={24} />, title: t('home_feat_join_title'), desc: t('home_feat_join_desc'), href: '/register' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #a11e00 0, #a11e00 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px'
        }} />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/glommenlogo.svg" alt="GLOMMENS MUAY THAI" className="w-28 h-28 sm:w-36 sm:h-36 drop-shadow-2xl" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/30 text-brand text-xs font-medium mb-5 uppercase tracking-widest">
            {t('home_badge')}
          </div>
          <h1
            className="text-5xl sm:text-7xl font-bold mb-6 leading-none tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-white">GLOMMENS</span>
            <br />
            <span className="text-brand">MUAY THAI</span>
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('home_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded transition-colors text-sm uppercase tracking-wider"
            >
              {t('home_cta_join')}
            </Link>
            <Link
              href="/schema"
              className="px-8 py-3.5 border border-zinc-700 hover:border-zinc-500 text-white font-semibold rounded transition-colors text-sm uppercase tracking-wider"
            >
              {t('home_cta_schedule')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <div className="w-6 h-10 border border-zinc-700 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-zinc-500 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-3 gap-6 text-center">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <div className="text-3xl font-bold text-brand mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {value}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Week Schedule Widget ── */}
      <WeekScheduleWidget sessions={sessions} />

      {/* Today's sessions */}
      {todaySessions.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{t('home_today_title')}</h2>
              <p className="text-zinc-500 text-sm">{t('home_today_sub')}</p>
            </div>
            <Link href="/schema" className="text-brand hover:text-brand-hover text-sm flex items-center gap-1">
              {t('home_full_schedule')} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySessions.map(s => (
              <SessionPreview key={s.id} session={s} user={user} />
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard preview — logged-in members only */}
      {user && leaderboard && leaderboard.entries.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-brand" />
                <span className="text-white font-semibold text-sm">
                  {leaderboard.season?.name ?? 'Leaderboard'}
                </span>
              </div>
              <Link href="/leaderboard" className="text-brand hover:text-brand-hover text-xs flex items-center gap-1 transition-colors">
                View Full Leaderboard <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {leaderboard.entries.map(entry => (
                <div key={entry.rank} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-lg w-6 text-center shrink-0">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-white text-sm font-medium">{entry.name}</span>
                  <div className="flex items-center gap-1 text-brand font-bold text-sm">
                    <Star size={12} />
                    {entry.points.toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon, title, desc, href }) => (
            <Link
              key={href}
              href={href}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-brand/40 hover:bg-zinc-900/80 transition-all group"
            >
              <div className="text-brand mb-4 group-hover:scale-110 transition-transform">{icon}</div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming events */}
      {events.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-900">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">{t('home_upcoming')}</h2>
            <Link href="/events" className="text-brand hover:text-brand-hover text-sm flex items-center gap-1">
              {t('home_all_events')} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="text-brand text-sm font-semibold mb-1 uppercase tracking-wide">
                  {new Date(ev.date).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { month: 'short', day: 'numeric' })}
                </div>
                <h3 className="text-white font-medium mb-1">{ev.title}</h3>
                {ev.location && <p className="text-zinc-500 text-sm">{ev.location}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About / CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            {t('home_about_title')}
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            {t('home_about_text')}
          </p>
          {!user && (
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded transition-colors"
            >
              {t('home_register_free')}
            </Link>
          )}
        </div>
      </section>

      {/* Find Us */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            {t('home_location_title')}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 rounded-xl overflow-hidden border border-zinc-800 shadow-lg shadow-black/40">
              <iframe
                src="https://maps.google.com/maps?q=Glommens+Thaiboxningsklubb+Falkenberg+Sweden&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="380"
                style={{ border: 0, display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Glommens Thaiboxningsklubb"
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('contact_address_label')}</p>
                <p className="text-white font-semibold">Glommens Thaiboxningsklubb</p>
                <p className="text-zinc-400 text-sm mt-0.5">{t('home_location_address')}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('contact_website_label')}</p>
                <a
                  href="http://www.thaibox.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand-hover transition-colors text-sm font-medium"
                >
                  {t('home_location_website')}
                </a>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('home_location_hours')}</p>
                <p className="text-zinc-400 text-sm">{t('home_location_hours_note')}</p>
                <Link href="/schema" className="text-brand hover:text-brand-hover text-sm mt-2 inline-block transition-colors">
                  {t('contact_schedule_link')} →
                </Link>
              </div>

              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Glommens+Thaiboxningsklubb+Falkenberg+Sweden"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {t('home_location_directions')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function SessionPreview({ session, user }: { session: Session; user: { name: string } | null }) {
  const [checkedIn, setCheckedIn] = useState(session.checkedIn)
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const handleCheckIn = async () => {
    if (!user) { window.location.href = '/login'; return }
    setLoading(true)
    const method = checkedIn ? 'DELETE' : 'POST'
    const res = await fetch('/api/checkin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    })
    if (res.ok) setCheckedIn(!checkedIn)
    setLoading(false)
  }

  const trainerName = session.trainers[0]?.name ?? null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[session.type] ?? 'bg-zinc-700 text-zinc-300'}`}>
            {getSessionTypeLabel(session.type, t)}
          </span>
        </div>
        <span className="text-zinc-500 text-xs flex items-center gap-1">
          <Users size={12} /> {session.checkInCount}/{session.maxCapacity}
        </span>
      </div>
      <h3 className="text-white font-semibold mb-1">{session.name}</h3>
      <div className="flex items-center gap-1 text-zinc-400 text-sm mb-4">
        <Clock size={14} />
        {session.startTime}–{session.endTime}
        {trainerName && <span className="ml-2 text-zinc-600">· {trainerName}</span>}
      </div>
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className={`w-full py-2 rounded text-sm font-medium transition-colors ${
          checkedIn
            ? 'bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30'
            : 'bg-brand hover:bg-brand-hover text-white'
        }`}
      >
        {loading ? '...' : checkedIn ? t('home_checked_in') : t('home_checkin')}
      </button>
    </div>
  )
}
