'use client'

import { useEffect, useState } from 'react'
import { Users, CheckCircle2, Calendar, ShieldAlert, ShieldCheck, X, AlertTriangle, Clock, UserCheck, UserX } from 'lucide-react'
import { getSessionTypeLabel, getTodayString, formatRelative } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

type PendingMember = {
  id: string
  name: string
  email: string
  createdAt: string
}

type ConfirmedTrainer = { user: { id: string; name: string } }

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
  isCancelled: boolean
  cancellationReason: string | null
  cancelledBy: string | null
  confirmedTrainers: ConfirmedTrainer[]
  iAmConfirmed: boolean
}

type CheckIn = {
  id: string
  user: { id: string; name: string; membershipPaid: boolean }
  createdAt: string
}

type Me = { userId: string; role: string; name: string }

const DAY_KEYS: TranslationKey[] = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']

export default function TrainerDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [loadingCheckIns, setLoadingCheckIns] = useState(false)
  const [loading, setLoading] = useState(true)
  // Pending members
  const [pending, setPending] = useState<PendingMember[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingMember | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    Promise.all([
      fetch('/api/sessions').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/members/pending').then(r => r.json()),
    ]).then(([s, u, p]) => {
      setSessions(s.data ?? [])
      setMe(u.data ?? null)
      setPending(p.data ?? [])
      setLoading(false)
    })
  }, [])

  const confirmMember = async (member: PendingMember) => {
    setConfirmingId(member.id)
    const res = await fetch(`/api/members/${member.id}/confirm`, { method: 'POST' })
    if (res.ok) setPending(prev => prev.filter(p => p.id !== member.id))
    setConfirmingId(null)
  }

  const rejectMember = async () => {
    if (!rejectTarget) return
    setRejecting(true)
    const res = await fetch(`/api/members/${rejectTarget.id}/confirm`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason || null }),
    })
    if (res.ok) setPending(prev => prev.filter(p => p.id !== rejectTarget.id))
    setRejecting(false)
    setRejectTarget(null)
    setRejectReason('')
  }

  const loadCheckIns = async (session: Session, date: string) => {
    setSelectedSession(session)
    setLoadingCheckIns(true)
    const res = await fetch(`/api/checkin/session/${session.id}?date=${date}`)
    const data = await res.json()
    setCheckIns(data.data ?? [])
    setLoadingCheckIns(false)
  }

  const handleConfirmTrainer = async (session: Session) => {
    const res = await fetch(`/api/sessions/${session.id}/confirm-trainer`, { method: 'POST' })
    if (!res.ok) return
    const { data } = await res.json()
    setSessions(prev => prev.map(s =>
      s.id === session.id
        ? { ...s, confirmedTrainers: data.confirmedTrainers, iAmConfirmed: !s.iAmConfirmed }
        : s
    ))
    if (selectedSession?.id === session.id) {
      setSelectedSession(prev => prev ? {
        ...prev,
        confirmedTrainers: data.confirmedTrainers,
        iAmConfirmed: !prev.iAmConfirmed,
      } : prev)
    }
  }

  const handleCancelSubmit = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    const res = await fetch(`/api/sessions/${cancelTarget.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellationReason: cancelReason || null }),
    })
    if (res.ok) {
      const update = { isCancelled: true, cancellationReason: cancelReason || null }
      setSessions(prev => prev.map(s => s.id === cancelTarget.id ? { ...s, ...update } : s))
      if (selectedSession?.id === cancelTarget.id) {
        setSelectedSession(prev => prev ? { ...prev, ...update } : prev)
      }
    }
    setCancelling(false)
    setCancelTarget(null)
    setCancelReason('')
  }

  const handleUncancel = async (session: Session) => {
    const res = await fetch(`/api/sessions/${session.id}/uncancel`, { method: 'POST' })
    if (!res.ok) return
    const update = { isCancelled: false, cancellationReason: null }
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, ...update } : s))
    if (selectedSession?.id === session.id) {
      setSelectedSession(prev => prev ? { ...prev, ...update } : prev)
    }
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

      {/* Pending members */}
      {pending.length > 0 && (
        <div className="mb-6 bg-yellow-950/20 border border-yellow-800/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-yellow-800/30">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-yellow-300 font-semibold text-sm">{t('pend_title')}</span>
            <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          </div>
          <ul className="divide-y divide-yellow-900/20">
            {pending.map(p => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{p.email}</p>
                  </div>
                  <span className="text-zinc-600 text-xs whitespace-nowrap hidden sm:block">
                    {formatRelative(p.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => confirmMember(p)}
                    disabled={confirmingId === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-900/40 text-green-400 border border-green-800/50 hover:bg-green-900/60 transition-colors disabled:opacity-50"
                  >
                    <UserCheck size={12} />
                    {confirmingId === p.id ? t('pend_confirming') : t('pend_confirm')}
                  </button>
                  <button
                    onClick={() => { setRejectTarget(p); setRejectReason('') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition-colors"
                  >
                    <UserX size={12} />
                    {t('pend_reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                      <SessionListItem
                        key={s.id}
                        session={s}
                        isSelected={selectedSession?.id === s.id}
                        onSelect={() => loadCheckIns(s, selectedDate)}
                        onConfirm={() => handleConfirmTrainer(s)}
                        onCancel={() => { setCancelTarget(s); setCancelReason('') }}
                        onUncancel={() => handleUncancel(s)}
                        t={t}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Check-in panel */}
        <div className="lg:col-span-3">
          {!selectedSession ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600 text-center">
              <Users size={40} className="mb-3" />
              <p>{t('tr_select')}</p>
            </div>
          ) : (
            <div className={`rounded-xl p-6 border ${
              selectedSession.isCancelled
                ? 'bg-zinc-900 border-red-900/60'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className={`font-semibold text-lg ${selectedSession.isCancelled ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {selectedSession.name}
                    </h2>
                    {selectedSession.isCancelled && (
                      <span className="text-[10px] font-black tracking-widest text-red-400 border border-red-700/60 bg-red-950/60 px-2 py-0.5 rounded">
                        {t('tr_cancelled_badge')}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${selectedSession.isCancelled ? 'text-zinc-600 line-through' : 'text-zinc-500'}`}>
                    {selectedDate} · {selectedSession.startTime}–{selectedSession.endTime}
                  </p>
                  {selectedSession.isCancelled && selectedSession.cancellationReason && (
                    <p className="text-red-400/80 text-xs mt-2 bg-red-950/30 rounded px-2 py-1.5 border border-red-900/30">
                      {t('tr_cancelled_reason')}: {selectedSession.cancellationReason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand" style={{ fontFamily: 'var(--font-display)' }}>
                    {checkIns.length}
                  </div>
                  <div className="text-zinc-600 text-xs">{t('tr_of')} {selectedSession.maxCapacity}</div>
                </div>
              </div>

              {/* Confirmed trainers */}
              <div className="mb-4 pb-4 border-b border-zinc-800">
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">{t('tr_confirmed_trainers')}</p>
                {selectedSession.confirmedTrainers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSession.confirmedTrainers.map(ct => (
                      <span
                        key={ct.user.id}
                        className="text-xs bg-green-900/30 text-green-400 border border-green-800/40 px-2.5 py-1 rounded-full flex items-center gap-1"
                      >
                        <ShieldCheck size={11} />
                        {ct.user.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs bg-yellow-900/20 text-yellow-500 border border-yellow-800/30 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                    <ShieldAlert size={11} />
                    {t('tr_trainer_tbc')}
                  </span>
                )}
              </div>

              {/* Capacity bar */}
              <div className="mb-4">
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

      {/* Reject member modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserX size={18} className="text-red-400" />
                <h3 className="text-white font-semibold">{t('pend_reject')} – {rejectTarget.name}</h3>
              </div>
              <button onClick={() => setRejectTarget(null)} className="text-zinc-600 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={t('pend_reject_reason')}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-red-700 resize-none placeholder-zinc-600"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
              >
                {t('ev_cancel')}
              </button>
              <button
                onClick={rejectMember}
                disabled={rejecting}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-900/60 text-red-300 border border-red-800/60 hover:bg-red-900 hover:text-white transition-colors disabled:opacity-50"
              >
                {rejecting ? t('pend_rejecting') : t('pend_reject_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                <h3 className="text-white font-semibold">{t('tr_cancel_class')}</h3>
              </div>
              <button
                onClick={() => { setCancelTarget(null); setCancelReason('') }}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-zinc-400 text-sm mb-4">
              <span className="text-white font-medium">{cancelTarget.name}</span>
              {' · '}{cancelTarget.startTime}–{cancelTarget.endTime}
            </p>

            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder={t('tr_cancel_reason')}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-red-700 resize-none placeholder-zinc-600"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setCancelTarget(null); setCancelReason('') }}
                className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
              >
                {t('ev_cancel')}
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={cancelling}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-900/60 text-red-300 border border-red-800/60 hover:bg-red-900 hover:text-white transition-colors disabled:opacity-50"
              >
                {cancelling ? t('tr_cancelling') : t('tr_cancel_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionListItem({
  session: s,
  isSelected,
  onSelect,
  onConfirm,
  onCancel,
  onUncancel,
  t,
}: {
  session: Session
  isSelected: boolean
  onSelect: () => void
  onConfirm: () => void
  onCancel: () => void
  onUncancel: () => void
  t: (key: TranslationKey) => string
}) {
  const hasTrainer = s.confirmedTrainers.length > 0

  return (
    <div
      className={`mb-1.5 rounded-lg border transition-colors ${
        s.isCancelled
          ? 'bg-red-950/20 border-red-900/50'
          : !hasTrainer
          ? 'bg-yellow-950/10 border-yellow-900/30'
          : isSelected
          ? 'bg-brand/20 border-brand/30'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Main clickable row */}
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${s.isCancelled ? 'text-zinc-500 line-through' : 'text-white'}`}>
                {s.name}
              </span>
              {s.isCancelled && (
                <span className="text-[9px] font-black tracking-widest text-red-400 border border-red-700/60 bg-red-950/50 px-1.5 py-0.5 rounded">
                  {t('tr_cancelled_badge')}
                </span>
              )}
              {!s.isCancelled && !hasTrainer && (
                <span className="text-[9px] text-yellow-500 border border-yellow-800/40 bg-yellow-950/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ShieldAlert size={9} /> TBC
                </span>
              )}
            </div>
            <div className={`text-xs mt-0.5 ${s.isCancelled ? 'text-zinc-600' : 'text-zinc-500'}`}>
              {s.startTime}–{s.endTime} · {getSessionTypeLabel(s.type, t)}
            </div>
            {!s.isCancelled && hasTrainer && (
              <div className="flex flex-wrap gap-1 mt-1">
                {s.confirmedTrainers.map(ct => (
                  <span key={ct.user.id} className="text-[9px] text-green-400 bg-green-900/20 border border-green-800/30 px-1.5 py-0.5 rounded-full">
                    {ct.user.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-zinc-500 flex items-center gap-1 ml-2 shrink-0">
            <Users size={11} />
            {s.checkInCount}/{s.maxCapacity}
          </span>
        </div>
      </button>

      {/* Action buttons row */}
      <div className="flex gap-1.5 px-3 pb-2.5">
        {!s.isCancelled && (
          <button
            onClick={e => { e.stopPropagation(); onConfirm() }}
            className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
              s.iAmConfirmed
                ? 'bg-green-900/30 text-green-400 border border-green-800/40 hover:bg-green-900/50'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
            }`}
          >
            {s.iAmConfirmed ? '✅ ' + t('tr_confirmed_session').replace('✅ ', '') : t('tr_confirm_session')}
          </button>
        )}
        {s.isCancelled ? (
          <button
            onClick={e => { e.stopPropagation(); onUncancel() }}
            className="flex-1 py-1 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            {t('tr_uncancel_class')}
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onCancel() }}
            className="py-1 px-2 rounded text-[10px] font-medium bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-950/60 transition-colors"
          >
            {t('tr_cancel_class')}
          </button>
        )}
      </div>
    </div>
  )
}
