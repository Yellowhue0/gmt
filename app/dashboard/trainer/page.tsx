'use client'

import { useEffect, useState } from 'react'
import { Users, CheckCircle2, Calendar } from 'lucide-react'
import { getSessionTypeLabel, getTodayString } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

type Session = {
  id: string
  name: string
  startTime: string
  endTime: string
  type: string
  dayOfWeek: number
  maxCapacity: number
  checkInCount: number
  trainer: { name: string } | null
}

type CheckIn = {
  id: string
  user: { id: string; name: string; membershipPaid: boolean }
  createdAt: string
}

const DAY_KEYS: TranslationKey[] = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']

export default function TrainerDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [loadingCheckIns, setLoadingCheckIns] = useState(false)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d.data ?? []); setLoading(false) })
  }, [])

  const loadCheckIns = async (session: Session, date: string) => {
    setSelectedSession(session)
    setLoadingCheckIns(true)
    const res = await fetch(`/api/checkin/session/${session.id}?date=${date}`)
    const data = await res.json()
    setCheckIns(data.data ?? [])
    setLoadingCheckIns(false)
  }

  const todayDow = new Date(selectedDate).getDay()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {t('tr_title')}
        </h1>
        <p className="text-zinc-500">{t('tr_sub')}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Session list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={16} className="text-zinc-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value)
                if (selectedSession) loadCheckIns(selectedSession, e.target.value)
              }}
              className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {loading ? (
            <p className="text-zinc-600 text-sm">{t('tr_loading')}</p>
          ) : (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                const daySessions = sessions.filter(s => s.dayOfWeek === dow)
                if (!daySessions.length) return null
                return (
                  <div key={dow}>
                    <div className={`text-xs uppercase tracking-wider mb-1.5 font-medium ${
                      dow === todayDow ? 'text-brand' : 'text-zinc-600'
                    }`}>
                      {t(DAY_KEYS[dow])}{dow === todayDow ? ` ${t('tr_today')}` : ''}
                    </div>
                    {daySessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => loadCheckIns(s, selectedDate)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-1.5 ${
                          selectedSession?.id === s.id
                            ? 'bg-brand/20 border border-brand/30'
                            : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-white text-sm font-medium">{s.name}</span>
                            <div className="text-zinc-500 text-xs mt-0.5">
                              {s.startTime}–{s.endTime} · {getSessionTypeLabel(s.type)}
                            </div>
                          </div>
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Users size={11} />
                            {s.checkInCount}/{s.maxCapacity}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Check-in list */}
        <div className="lg:col-span-3">
          {!selectedSession ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600 text-center">
              <Users size={40} className="mb-3" />
              <p>{t('tr_select')}</p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-semibold text-lg">{selectedSession.name}</h2>
                  <p className="text-zinc-500 text-sm">
                    {selectedDate} · {selectedSession.startTime}–{selectedSession.endTime}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand" style={{ fontFamily: 'var(--font-display)' }}>
                    {checkIns.length}
                  </div>
                  <div className="text-zinc-600 text-xs">{t('tr_of')} {selectedSession.maxCapacity}</div>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mb-6">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${Math.min((checkIns.length / selectedSession.maxCapacity) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {loadingCheckIns ? (
                <p className="text-zinc-600 text-sm text-center py-8">{t('tr_loading')}</p>
              ) : checkIns.length === 0 ? (
                <div className="text-center py-10 text-zinc-600">
                  <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('tr_no_checkins')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {checkIns.map((ci, i) => (
                    <div
                      key={ci.id}
                      className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600 text-xs w-5">{i + 1}</span>
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-white">
                          {ci.user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white text-sm">{ci.user.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!ci.user.membershipPaid && (
                          <span className="text-xs bg-yellow-900/30 text-yellow-500 border border-yellow-900/30 px-2 py-0.5 rounded-full">
                            {t('tr_not_paid')}
                          </span>
                        )}
                        <CheckCircle2 size={14} className="text-brand" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
