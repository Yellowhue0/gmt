'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, Users } from 'lucide-react'
import { formatDate, SWISH_NUMBER, MEMBERSHIP_PRICE, getSessionTypeLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

type User = {
  id: string
  name: string
  email: string
  role: string
  membershipPaid: boolean
  membershipExpiry: string | null
  swishNumber: string | null
}

type Session = {
  id: string
  name: string
  startTime: string
  endTime: string
  type: string
  dayOfWeek: number
  isToday: boolean
  checkedIn: boolean
  checkInCount: number
  maxCapacity: number
}

const ROLE_KEY: Record<string, TranslationKey> = {
  ADMIN: 'role_admin',
  TRAINER: 'role_trainer',
  MEMBER: 'role_member',
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
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

  const handleCheckIn = async (session: Session) => {
    const method = session.checkedIn ? 'DELETE' : 'POST'
    const res = await fetch('/api/checkin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    })
    if (res.ok) {
      setSessions(prev => prev.map(s =>
        s.id === session.id
          ? { ...s, checkedIn: !s.checkedIn, checkInCount: s.checkInCount + (s.checkedIn ? -1 : 1) }
          : s
      ))
    }
  }

  if (loading) return <div className="text-zinc-600 text-center py-20">{t('dash_loading')}</div>
  if (!user) return null

  const todaySessions = sessions.filter(s => s.isToday)
  const expiry = user.membershipExpiry ? new Date(user.membershipExpiry) : null
  const isExpiring = expiry && (expiry.getTime() - Date.now()) < 14 * 24 * 60 * 60 * 1000

  const accountRows = [
    { label: t('dash_name'), value: user.name },
    { label: t('dash_email'), value: user.email },
    { label: t('dash_role'), value: t(ROLE_KEY[user.role] ?? 'role_member') },
    { label: t('dash_swish'), value: user.swishNumber ?? t('dash_not_set') },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {t('dash_hello')}, {user.name}!
        </h1>
        <p className="text-zinc-500">{t('dash_welcome')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Membership status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm text-zinc-400 uppercase tracking-wider mb-4">{t('dash_membership')}</h2>
          {user.membershipPaid ? (
            <div>
              <div className="flex items-center gap-2 text-green-400 mb-3">
                <CheckCircle2 size={20} />
                <span className="font-semibold">{t('dash_active')}</span>
              </div>
              {expiry && (
                <p className={`text-sm ${isExpiring ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {isExpiring ? t('dash_expiring') : t('dash_expires')} {formatDate(expiry)}
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-zinc-500 mb-4">
                <XCircle size={20} />
                <span className="font-semibold text-white">{t('dash_unpaid')}</span>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 space-y-1.5 text-sm">
                <p className="text-zinc-400 font-medium">{t('dash_how_to')}</p>
                <ol className="text-zinc-500 space-y-1 list-decimal list-inside">
                  <li>{t('dash_swish_step1')} <span className="text-white font-medium">{MEMBERSHIP_PRICE} kr</span></li>
                  <li>{t('dash_swish_step2')} <span className="text-white font-medium">{SWISH_NUMBER}</span></li>
                  <li>{t('dash_swish_step3')} <span className="text-white font-medium">&quot;{user.name} – Medlemskap&quot;</span></li>
                  <li>{t('dash_swish_step4')}</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Account info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm text-zinc-400 uppercase tracking-wider mb-4">{t('dash_account')}</h2>
          <div className="space-y-3">
            {accountRows.map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-500">{label}</span>
                <span className="text-zinc-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's sessions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          {todaySessions.length > 0 ? t('dash_today') : t('dash_scheduled')}
        </h2>
        {todaySessions.length === 0 ? (
          <p className="text-zinc-600">
            {t('dash_no_sessions')}{' '}
            <a href="/schema" className="text-brand hover:underline">{t('dash_full_schedule')}</a>.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {todaySessions.map(s => (
              <div key={s.id} className="bg-zinc-900 border border-brand/20 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {getSessionTypeLabel(s.type)}
                  </span>
                  <span className="text-zinc-600 text-xs flex items-center gap-1">
                    <Users size={11} /> {s.checkInCount}/{s.maxCapacity}
                  </span>
                </div>
                <h3 className="text-white font-semibold mb-1">{s.name}</h3>
                <div className="flex items-center gap-1 text-zinc-500 text-sm mb-4">
                  <Clock size={13} /> {s.startTime}–{s.endTime}
                </div>
                <button
                  onClick={() => handleCheckIn(s)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    s.checkedIn
                      ? 'bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30'
                      : 'bg-brand hover:bg-brand-hover text-white'
                  }`}
                >
                  {s.checkedIn ? t('dash_checked_in') : t('dash_checkin')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
