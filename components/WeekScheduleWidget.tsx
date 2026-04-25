'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export type SessionForWidget = {
  id: string
  name: string
  startTime: string
  endTime: string
  type: string
  dayOfWeek: number   // JS: 0=Sun, 1=Mon … 6=Sat
  date: string | null // ISO – one-time sessions only
  isCancelled: boolean
  isRecurring: boolean
}

// Display columns Mon=0 … Sun=6, mapped to JS getDay() values
const DISPLAY_TO_DOW = [1, 2, 3, 4, 5, 6, 0]

const TYPE_DOT: Record<string, string> = {
  regular:      'bg-zinc-500',
  sparring:     'bg-orange-400',
  yoga:         'bg-purple-400',
  youth:        'bg-blue-400',
  conditioning: 'bg-red-400',
  girls:        'bg-pink-400',
}

const TYPE_BORDER: Record<string, string> = {
  regular:      'border-zinc-700/50 hover:border-zinc-600/80',
  sparring:     'border-orange-500/20 hover:border-orange-500/50',
  yoga:         'border-purple-500/20 hover:border-purple-500/50',
  youth:        'border-blue-500/20 hover:border-blue-500/50',
  conditioning: 'border-red-500/20 hover:border-red-500/50',
  girls:        'border-pink-500/20 hover:border-pink-500/50',
}

function getMondayOf(weekOffset: number): Date {
  const d = new Date()
  const dow = d.getDay()
  const daysToMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(d)
  mon.setDate(d.getDate() + daysToMon + weekOffset * 7)
  mon.setHours(0, 0, 0, 0)
  return mon
}

export function WeekScheduleWidget({ sessions }: { sessions: SessionForWidget[] }) {
  const { lang } = useLanguage()

  const todayDow = new Date().getDay()
  const todayDisplayIdx = DISPLAY_TO_DOW.indexOf(todayDow)

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(todayDisplayIdx >= 0 ? todayDisplayIdx : 0)

  useEffect(() => {
    if (weekOffset === 0 && todayDisplayIdx >= 0) setSelectedDay(todayDisplayIdx)
  }, [weekOffset, todayDisplayIdx])

  const monday = useMemo(() => getMondayOf(weekOffset), [weekOffset])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    }), [monday])

  const sessionsByDay = useMemo(() =>
    weekDays.map(day => {
      const jsDow = day.getDay()
      const dateStr = day.toISOString().slice(0, 10)
      return sessions
        .filter(s =>
          !s.isRecurring && s.date
            ? s.date.slice(0, 10) === dateStr
            : s.dayOfWeek === jsDow
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }), [sessions, weekDays])

  const DAY_SHORT = lang === 'sv'
    ? ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const LEGEND = [
    { dot: 'bg-zinc-500',   label: lang === 'sv' ? 'Alla' : 'General' },
    { dot: 'bg-red-400',    label: 'Fighters' },
    { dot: 'bg-blue-400',   label: lang === 'sv' ? 'Barn' : 'Kids' },
    { dot: 'bg-orange-400', label: 'Sparring' },
    { dot: 'bg-purple-400', label: 'Yoga' },
    { dot: 'bg-pink-400',   label: 'Girls' },
  ]

  // Shared pill renderer
  const renderPill = (s: SessionForWidget, compact = false) => {
    const dot = s.isCancelled ? 'bg-red-500' : (TYPE_DOT[s.type] ?? 'bg-zinc-500')
    const border = s.isCancelled
      ? 'border-red-900/30 hover:border-red-800/50 opacity-60'
      : (TYPE_BORDER[s.type] ?? TYPE_BORDER.regular)

    return (
      <Link
        key={s.id}
        href={`/schedule/${s.id}`}
        className={`block rounded-md border bg-zinc-900/80 transition-all hover:bg-zinc-900 ${border} ${compact ? 'px-1.5 py-1' : 'px-3 py-2.5'}`}
      >
        {compact ? (
          <div className="flex items-start gap-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[3px] ${dot}`} />
            <div className="min-w-0">
              <p className={`text-[10px] font-medium leading-tight truncate ${s.isCancelled ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                {s.name}
              </p>
              <p className="text-[9px] text-zinc-600 tabular-nums mt-0.5">{s.startTime}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.isCancelled ? 'line-through text-zinc-600' : 'text-white'}`}>
                {s.name}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">{s.startTime} – {s.endTime}</p>
            </div>
            <ChevronRight size={13} className="text-zinc-700 shrink-0" />
          </div>
        )}
      </Link>
    )
  }

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {lang === 'sv' ? 'Veckans Pass' : 'This Week'}
          </h2>
          <div className="flex items-center gap-3">
            {/* Week nav */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors rounded"
                >
                  {lang === 'sv' ? 'Denna vecka' : 'This week'}
                </button>
              )}
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <Link
              href="/schema"
              className="text-brand hover:text-brand-hover text-sm flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              {lang === 'sv' ? 'Hela schemat' : 'Full Schedule'} <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* ── Desktop: 7 columns ── */}
        <div className="hidden md:grid grid-cols-7 gap-1.5">
          {weekDays.map((day, di) => {
            const isToday = weekOffset === 0 && di === todayDisplayIdx
            const isPast = weekOffset === 0 && di < todayDisplayIdx
            const daySessions = sessionsByDay[di]

            return (
              <div
                key={di}
                className={`rounded-xl p-2 min-h-28 ${
                  isToday ? 'bg-zinc-800/60 ring-1 ring-brand/20' : 'bg-zinc-900/30'
                } ${isPast ? 'opacity-40' : ''}`}
              >
                {/* Day header */}
                <div className="text-center mb-2.5 pb-2 border-b border-zinc-800/60">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-brand' : 'text-zinc-600'}`}>
                    {DAY_SHORT[di]}
                  </p>
                  <p className={`text-base font-bold leading-tight mt-0.5 ${isToday ? 'text-white' : 'text-zinc-400'}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Session pills */}
                <div className="space-y-1">
                  {daySessions.map(s => renderPill(s, true))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Mobile: scrollable day tabs + session list ── */}
        <div className="md:hidden">
          {/* Day tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {weekDays.map((day, di) => {
              const isToday = weekOffset === 0 && di === todayDisplayIdx
              const isPast = weekOffset === 0 && di < todayDisplayIdx
              const isSelected = di === selectedDay
              const hasSessions = sessionsByDay[di].length > 0

              return (
                <button
                  key={di}
                  onClick={() => setSelectedDay(di)}
                  className={`flex-none flex flex-col items-center w-12 py-2 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-brand text-white shadow-lg shadow-brand/20'
                      : isToday
                      ? 'bg-brand/15 text-brand ring-1 ring-brand/30'
                      : isPast
                      ? 'text-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide">{DAY_SHORT[di]}</span>
                  <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
                  <span className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected
                      ? 'bg-white/50'
                      : hasSessions
                      ? isToday ? 'bg-brand' : 'bg-zinc-600'
                      : 'bg-transparent'
                  }`} />
                </button>
              )
            })}
          </div>

          {/* Sessions for selected day */}
          <div className="mt-3">
            {sessionsByDay[selectedDay].length === 0 ? (
              // Empty — clean with no text per spec
              <div className="py-12 rounded-xl bg-zinc-900/30" />
            ) : (
              <div className="rounded-xl overflow-hidden bg-zinc-900/30 divide-y divide-zinc-800/40">
                {sessionsByDay[selectedDay].map(s => renderPill(s, false))}
              </div>
            )}
          </div>
        </div>

        {/* Colour legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 px-0.5">
          {LEGEND.map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
              <span className="text-[10px] text-zinc-600">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
