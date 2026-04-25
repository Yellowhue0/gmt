'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock, Users, Calendar, User, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type Session = {
  id: string
  name: string
  description: string | null
  dayOfWeek: number
  date: string | null
  startTime: string
  endTime: string
  type: string
  maxCapacity: number
  isCancelled: boolean
  cancellationReason: string | null
  isRecurring: boolean
  isToday: boolean
  checkedIn: boolean
  checkInCount: number
  trainers: { id: string; name: string }[]
}

const DAY_SV = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TYPE_DOT: Record<string, string> = {
  regular:      'bg-zinc-500',
  sparring:     'bg-orange-400',
  yoga:         'bg-purple-400',
  youth:        'bg-blue-400',
  conditioning: 'bg-red-400',
  girls:        'bg-pink-400',
}

export default function SessionDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { lang } = useLanguage()

  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/sessions/${id}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([s, me]) => {
      if (s.error) { setError(s.error); setLoading(false); return }
      setSession(s.data)
      setCheckedIn(s.data.checkedIn)
      if (me.data) setUser(me.data)
      setLoading(false)
    }).catch(() => { setError('Failed to load'); setLoading(false) })
  }, [id])

  const handleCheckIn = async () => {
    if (!user) { window.location.href = '/login'; return }
    setCheckInLoading(true)
    const method = checkedIn ? 'DELETE' : 'POST'
    const res = await fetch('/api/checkin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    })
    if (res.ok) {
      setCheckedIn(v => !v)
      setSession(prev => prev ? {
        ...prev,
        checkInCount: prev.checkInCount + (checkedIn ? -1 : 1),
      } : null)
    }
    setCheckInLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-600 text-sm">{lang === 'sv' ? 'Laddar…' : 'Loading…'}</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 text-sm">{lang === 'sv' ? 'Passet hittades inte.' : 'Session not found.'}</p>
        <Link href="/schema" className="text-brand hover:text-brand-hover text-sm transition-colors">
          ← {lang === 'sv' ? 'Tillbaka till schemat' : 'Back to schedule'}
        </Link>
      </div>
    )
  }

  const spotsLeft = session.maxCapacity - session.checkInCount
  const isFull = spotsLeft <= 0 && !checkedIn
  const dot = TYPE_DOT[session.type] ?? 'bg-zinc-500'

  const dayLabel = session.isRecurring
    ? (lang === 'sv' ? DAY_SV[session.dayOfWeek] : DAY_EN[session.dayOfWeek])
    : session.date
    ? new Date(session.date).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">

        {/* Back link */}
        <Link
          href="/schema"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          {lang === 'sv' ? 'Tillbaka till schemat' : 'Back to schedule'}
        </Link>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-black/40">

          {/* Header stripe */}
          <div className="px-6 py-5 border-b border-zinc-800">
            <div className="flex items-start gap-3">
              <span className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${dot}`} />
              <div>
                <h1 className="text-xl font-bold text-white leading-snug">{session.name}</h1>
                {session.isCancelled && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-400 text-xs font-medium">
                    <AlertTriangle size={12} />
                    {lang === 'sv' ? 'Inställt' : 'Cancelled'}
                    {session.cancellationReason && ` — ${session.cancellationReason}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4">
            {/* Day + time */}
            <div className="flex items-start gap-3">
              <Calendar size={15} className="text-zinc-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-200 capitalize">{dayLabel}</p>
                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                  <Clock size={11} /> {session.startTime} – {session.endTime}
                </p>
              </div>
            </div>

            {/* Trainers */}
            {session.trainers.length > 0 && (
              <div className="flex items-start gap-3">
                <User size={15} className="text-zinc-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">{lang === 'sv' ? 'Tränare' : 'Trainer'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {session.trainers.map(tr => (
                      <span key={tr.id} className="text-sm text-zinc-200">{tr.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {session.description && (
              <p className="text-sm text-zinc-400 leading-relaxed border-t border-zinc-800 pt-4">
                {session.description}
              </p>
            )}

            {/* Capacity */}
            <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
              <Users size={15} className="text-zinc-600 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">
                    {lang === 'sv' ? 'Platser' : 'Spots'}
                  </span>
                  <span className={`text-xs font-medium ${spotsLeft <= 3 && spotsLeft > 0 ? 'text-yellow-400' : isFull ? 'text-red-400' : 'text-zinc-400'}`}>
                    {isFull
                      ? (lang === 'sv' ? 'Fullbokat' : 'Full')
                      : `${spotsLeft} ${lang === 'sv' ? 'kvar' : 'left'}`}
                  </span>
                </div>
                {/* Capacity bar */}
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFull ? 'bg-red-500' : spotsLeft <= 3 ? 'bg-yellow-400' : 'bg-brand'
                    }`}
                    style={{ width: `${Math.min((session.checkInCount / session.maxCapacity) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-700 mt-1">
                  {session.checkInCount} / {session.maxCapacity}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6">
            {session.isCancelled ? (
              <div className="w-full py-3 rounded-xl bg-red-900/20 border border-red-900/40 text-red-400 text-sm font-medium text-center">
                {lang === 'sv' ? 'Passet är inställt' : 'This session is cancelled'}
              </div>
            ) : !user ? (
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold text-center transition-colors"
              >
                {lang === 'sv' ? 'Logga in för att checka in' : 'Log in to check in'}
              </Link>
            ) : !session.isToday ? (
              <div className="w-full py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-500 text-sm text-center">
                {lang === 'sv'
                  ? 'Incheckning öppnar på passets dag'
                  : 'Check-in opens on the day of the session'}
              </div>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={checkInLoading || (isFull && !checkedIn)}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  checkedIn
                    ? 'bg-brand/15 text-brand border border-brand/30 hover:bg-brand/25'
                    : isFull
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    : 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20'
                }`}
              >
                {checkInLoading ? '…' : checkedIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} />
                    {lang === 'sv' ? 'Incheckad — Avboka?' : 'Checked in — Cancel?'}
                  </span>
                ) : (
                  lang === 'sv' ? 'Checka in' : 'Check in'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Recurring note */}
        {session.isRecurring && (
          <p className="text-center text-xs text-zinc-700 mt-4">
            {lang === 'sv' ? 'Återkommande varje vecka' : 'Recurring every week'}
          </p>
        )}
      </div>
    </div>
  )
}
