'use client'

import { useEffect, useState } from 'react'
import { Users, Clock, CheckCircle2 } from 'lucide-react'
import { getSessionTypeLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

type Session = {
  id: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  type: string
  dayOfWeek: number
  maxCapacity: number
  isToday: boolean
  checkedIn: boolean
  checkInCount: number
  trainer: { id: string; name: string } | null
}

type User = { name: string; role: string } | null

const TYPE_COLORS: Record<string, string> = {
  regular: 'bg-zinc-800 text-zinc-300',
  sparring: 'bg-brand/20 text-brand border border-brand/30',
  yoga: 'bg-purple-900/30 text-purple-300',
  youth: 'bg-blue-900/30 text-blue-300',
  conditioning: 'bg-orange-900/30 text-orange-300',
  girls: 'bg-pink-900/30 text-pink-300',
}

const DAY_KEYS: TranslationKey[] = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']

export default function SchemaPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay())
  const { t } = useLanguage()

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/sessions').then(r => r.json()),
    ]).then(([u, s]) => {
      setUser(u.data)
      setSessions(s.data ?? [])
      setLoading(false)
    })
  }, [])

  const sessionsByDay = DAY_KEYS.map((_, dow) =>
    sessions.filter(s => s.dayOfWeek === dow)
  )

  const handleCheckIn = async (session: Session, cb: (v: boolean) => void) => {
    if (!user) { window.location.href = '/login'; return }
    const method = session.checkedIn ? 'DELETE' : 'POST'
    const res = await fetch('/api/checkin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    })
    if (res.ok) {
      cb(!session.checkedIn)
      setSessions(prev => prev.map(s =>
        s.id === session.id
          ? { ...s, checkedIn: !s.checkedIn, checkInCount: s.checkInCount + (s.checkedIn ? -1 : 1) }
          : s
      ))
    }
  }

  const todayDow = new Date().getDay()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {t('sched_title')}
        </h1>
        <p className="text-zinc-500">{t('sched_sub')}</p>
      </div>

      {/* Sunday sparring notice */}
      <div className="bg-brand/10 border border-brand/30 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-brand text-lg">⚠</span>
          <div>
            <h3 className="text-brand font-semibold text-sm mb-1">{t('sched_sunday_title')}</h3>
            <p className="text-zinc-400 text-sm">
              {t('sched_sunday_text')}{' '}
              <a href="/community?category=SPARRING" className="text-brand underline">{t('sched_sunday_link')}</a>{' '}
              {t('sched_sunday_suffix')}
            </p>
          </div>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {DAY_KEYS.map((dayKey, i) => {
          const hasSessions = sessionsByDay[i].length > 0
          const isToday = i === todayDow
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDay === i
                  ? 'bg-brand text-white'
                  : isToday
                  ? 'bg-zinc-800 text-white border border-brand/50'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              } ${!hasSessions ? 'opacity-50' : ''}`}
            >
              <span className="hidden sm:inline">{t(dayKey)}</span>
              <span className="sm:hidden">{t(dayKey).slice(0, 3)}</span>
              {isToday && <span className="ml-1.5 text-xs opacity-70">●</span>}
            </button>
          )
        })}
      </div>

      {/* Sessions for active day */}
      {loading ? (
        <div className="text-zinc-600 text-center py-16">{t('sched_loading')}</div>
      ) : sessionsByDay[activeDay].length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          {t('sched_no_sessions')} {t(DAY_KEYS[activeDay]).toLowerCase()}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessionsByDay[activeDay].map(session => (
            <SessionCard
              key={session.id}
              session={session}
              user={user}
              onCheckIn={handleCheckIn}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session,
  user,
  onCheckIn,
}: {
  session: Session
  user: User
  onCheckIn: (s: Session, cb: (v: boolean) => void) => void
}) {
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()
  const isToday = session.isToday
  const pct = (session.checkInCount / session.maxCapacity) * 100

  return (
    <div className={`bg-zinc-900 border rounded-xl p-5 transition-all ${
      isToday ? 'border-brand/30 shadow-lg shadow-brand/5' : 'border-zinc-800'
    }`}>
      {isToday && (
        <div className="text-brand text-xs font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-brand rounded-full" /> {t('sched_today')}
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[session.type] ?? 'bg-zinc-800 text-zinc-300'}`}>
          {getSessionTypeLabel(session.type)}
        </span>
        {session.checkedIn && (
          <CheckCircle2 size={16} className="text-brand" />
        )}
      </div>

      <h3 className="text-white font-semibold text-lg mb-2">{session.name}</h3>

      {session.description && (
        <p className="text-zinc-500 text-sm mb-3">{session.description}</p>
      )}

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Clock size={14} />
          {session.startTime} – {session.endTime}
        </div>
        {session.trainer && (
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Users size={14} />
            {session.trainer.name}
          </div>
        )}
      </div>

      {/* Capacity bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-600 mb-1">
          <span>{session.checkInCount} {t('sched_checked_in_count')}</span>
          <span>{t('sched_max')} {session.maxCapacity}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {isToday ? (
        <button
          disabled={loading}
          onClick={() => {
            setLoading(true)
            onCheckIn(session, () => setLoading(false))
          }}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            session.checkedIn
              ? 'bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30'
              : 'bg-brand hover:bg-brand-hover text-white'
          } disabled:opacity-60`}
        >
          {loading ? '...' : session.checkedIn ? t('sched_cancel_checkin') : t('sched_checkin')}
        </button>
      ) : (
        <div className="w-full py-2.5 rounded-lg text-sm text-center text-zinc-600 bg-zinc-800/50">
          {t('sched_not_available')}
        </div>
      )}
    </div>
  )
}
