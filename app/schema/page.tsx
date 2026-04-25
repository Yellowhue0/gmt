'use client'

import { useEffect, useState } from 'react'
import { Users, Clock, CheckCircle2, Pencil, Trash2, Plus, RefreshCw, Calendar } from 'lucide-react'
import { getSessionTypeLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'
import SessionFormModal from '@/components/SessionFormModal'

type Trainer = { id: string; name: string }

type Session = {
  id: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  type: string
  classType: string
  visibility: string
  dayOfWeek: number
  date: string | null
  maxCapacity: number
  isToday: boolean
  checkedIn: boolean
  checkInCount: number
  isRecurring: boolean
  seriesId: string | null
  trainers: Trainer[]
  attendees: { id: string; name: string }[] | null
}

type CurrentUser = { name: string; role: string; id?: string } | null

const TYPE_COLORS: Record<string, string> = {
  regular: 'bg-zinc-800 text-zinc-300',
  sparring: 'bg-brand/20 text-brand border border-brand/30',
  yoga: 'bg-purple-900/30 text-purple-300',
  youth: 'bg-blue-900/30 text-blue-300',
  conditioning: 'bg-orange-900/30 text-orange-300',
  girls: 'bg-pink-900/30 text-pink-300',
}

const DAY_KEYS: TranslationKey[] = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']

type DeleteState = {
  session: Session
  mode?: 'this' | 'all'
  step: 'confirm' | 'recurring'
} | null

export default function SchemaPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay())
  const [formSession, setFormSession] = useState<Session | null | undefined>(undefined)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)
  const { t } = useLanguage()

  const fetchData = () => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/sessions').then((r) => r.json()),
    ]).then(([u, s]) => {
      setUser(u.data)
      setSessions(s.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { fetchData() }, [])

  const isAdminOrTrainer = user?.role === 'ADMIN' || user?.role === 'TRAINER'

  const sessionsByDay = DAY_KEYS.map((_, dow) =>
    sessions.filter((s) => s.dayOfWeek === dow)
  )

  const handleCheckIn = async (session: Session) => {
    if (!user) { window.location.href = '/login'; return }
    const method = session.checkedIn ? 'DELETE' : 'POST'
    const res = await fetch('/api/checkin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    })
    if (res.ok) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, checkedIn: !s.checkedIn, checkInCount: s.checkInCount + (s.checkedIn ? -1 : 1) }
            : s
        )
      )
    }
  }

  const handleDeleteClick = (session: Session) => {
    if (session.isRecurring && session.seriesId) {
      setDeleteState({ session, step: 'recurring' })
    } else {
      setDeleteState({ session, step: 'confirm' })
    }
  }

  const handleDelete = async (deleteMode: 'this' | 'all') => {
    if (!deleteState) return
    const { session } = deleteState
    const res = await fetch(`/api/sessions/${session.id}?deleteMode=${deleteMode}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      fetchData()
    }
    setDeleteState(null)
  }

  const handleAssignSelf = async (session: Session) => {
    if (!user?.id) return
    const isAssigned = session.trainers.some((tr) => tr.id === user.id)
    const method = isAssigned ? 'DELETE' : 'POST'
    const res = await fetch(`/api/sessions/${session.id}/assign-trainer`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainerId: user.id }),
    })
    if (res.ok) fetchData()
  }

  const handleAdminRemoveTrainer = async (session: Session, trainerId: string) => {
    const res = await fetch(`/api/sessions/${session.id}/assign-trainer`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainerId }),
    })
    if (res.ok) fetchData()
  }

  const handleAdminAddTrainer = async (session: Session, trainerId: string) => {
    const res = await fetch(`/api/sessions/${session.id}/assign-trainer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainerId }),
    })
    if (res.ok) fetchData()
  }

  const todayDow = new Date().getDay()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Session form modal */}
      {formSession !== undefined && (
        <SessionFormModal
          session={formSession}
          onClose={() => setFormSession(undefined)}
          onSaved={() => { setFormSession(undefined); fetchData() }}
        />
      )}

      {/* Delete confirmation */}
      {deleteState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
            {deleteState.step === 'recurring' ? (
              <>
                <h3 className="text-white font-semibold mb-2">{t('sess_delete_recurring_title')}</h3>
                <p className="text-zinc-400 text-sm mb-5">{t('sess_delete_confirm_msg')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteState(null)}
                    className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
                  >
                    {t('sess_cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete('this')}
                    className="flex-1 py-2 rounded-lg border border-red-700/50 text-red-400 text-sm hover:bg-red-900/30 transition-colors"
                  >
                    {t('sess_delete_this_only')}
                  </button>
                  <button
                    onClick={() => handleDelete('all')}
                    className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm hover:bg-red-600 transition-colors"
                  >
                    {t('sess_delete_all')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-white font-semibold mb-2">{t('sess_delete_confirm_title')}</h3>
                <p className="text-zinc-400 text-sm mb-5">{t('sess_delete_confirm_msg')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteState(null)}
                    className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
                  >
                    {t('sess_cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete('this')}
                    className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm hover:bg-red-600 transition-colors"
                  >
                    {t('sess_delete_confirm_btn')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t('sched_title')}
          </h1>
          <p className="text-zinc-500">{t('sched_sub')}</p>
        </div>
        {isAdminOrTrainer && (
          <button
            onClick={() => setFormSession(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          >
            <Plus size={16} />
            {t('sess_create_class')}
          </button>
        )}
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
          {sessionsByDay[activeDay].map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              user={user}
              isAdminOrTrainer={isAdminOrTrainer}
              onCheckIn={handleCheckIn}
              onEdit={() => setFormSession(session)}
              onDelete={() => handleDeleteClick(session)}
              onAssignSelf={() => handleAssignSelf(session)}
              onAdminRemoveTrainer={(tid) => handleAdminRemoveTrainer(session, tid)}
              onAdminAddTrainer={(tid) => handleAdminAddTrainer(session, tid)}
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
  isAdminOrTrainer,
  onCheckIn,
  onEdit,
  onDelete,
  onAssignSelf,
  onAdminRemoveTrainer,
  onAdminAddTrainer,
}: {
  session: Session
  user: CurrentUser
  isAdminOrTrainer: boolean
  onCheckIn: (s: Session) => void
  onEdit: () => void
  onDelete: () => void
  onAssignSelf: () => void
  onAdminRemoveTrainer: (trainerId: string) => void
  onAdminAddTrainer: (trainerId: string) => void
}) {
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [trainerPickerOpen, setTrainerPickerOpen] = useState(false)
  const [availableTrainers, setAvailableTrainers] = useState<{ id: string; name: string; role: string }[]>([])
  const { t } = useLanguage()

  const isToday = session.isToday
  const pct = Math.min((session.checkInCount / session.maxCapacity) * 100, 100)
  const assignedIds = new Set(session.trainers.map((tr) => tr.id))
  const isSelfAssigned = user?.id ? assignedIds.has(user.id) : false

  const openTrainerPicker = async () => {
    const res = await fetch('/api/users?roles=TRAINER,ADMIN')
    const d = await res.json()
    setAvailableTrainers(d.data ?? [])
    setTrainerPickerOpen(true)
  }

  return (
    <div className={`bg-zinc-900 border rounded-xl p-5 transition-all ${
      isToday ? 'border-brand/30 shadow-lg shadow-brand/5' : 'border-zinc-800'
    }`}>
      {/* Today badge */}
      {isToday && (
        <div className="text-brand text-xs font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-brand rounded-full" /> {t('sched_today')}
        </div>
      )}

      {/* Top row: type badge + badges + actions */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[session.type] ?? 'bg-zinc-800 text-zinc-300'}`}>
            {getSessionTypeLabel(session.type, t)}
          </span>
          {session.isRecurring && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 flex items-center gap-1">
              <RefreshCw size={10} /> {t('sess_recurring_badge')}
            </span>
          )}
          {!session.isRecurring && session.date && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 flex items-center gap-1">
              <Calendar size={10} /> {t('sess_one_time_badge')}
            </span>
          )}
          {session.checkedIn && <CheckCircle2 size={16} className="text-brand mt-0.5" />}
        </div>

        {/* Admin/Trainer action buttons */}
        {isAdminOrTrainer && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              title={t('sess_edit')}
            >
              <Pencil size={14} />
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                title={t('sess_delete')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <h3 className="text-white font-semibold text-lg mb-2">{session.name}</h3>

      {session.description && (
        <p className="text-zinc-500 text-sm mb-3">{session.description}</p>
      )}

      {/* Time */}
      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
        <Clock size={14} />
        {session.startTime} – {session.endTime}
      </div>

      {/* One-time date */}
      {!session.isRecurring && session.date && (
        <div className="flex items-center gap-2 text-blue-400 text-xs mb-2">
          <Calendar size={12} />
          {new Date(session.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      )}

      {/* Trainers */}
      <div className="mb-4">
        {session.trainers.length === 0 ? (
          <div className="flex items-center gap-1.5 text-amber-500 text-xs">
            <Users size={12} />
            <span>{t('sess_no_trainer')}</span>
          </div>
        ) : (
          <div className="flex items-start gap-1.5">
            <Users size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              {session.trainers.map((tr) => (
                <div key={tr.id} className="flex items-center gap-1.5">
                  <span className="text-zinc-400 text-sm">{tr.name}</span>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => onAdminRemoveTrainer(tr.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors"
                      title="Ta bort tränare"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin: add trainer button */}
        {user?.role === 'ADMIN' && (
          <div className="mt-2 relative">
            <button
              onClick={openTrainerPicker}
              className="text-xs text-zinc-600 hover:text-brand transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> Lägg till tränare
            </button>
            {trainerPickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setTrainerPickerOpen(false)} />
                <div className="absolute left-0 top-6 z-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[180px]">
                  {availableTrainers
                    .filter((tr) => !assignedIds.has(tr.id))
                    .map((tr) => (
                      <button
                        key={tr.id}
                        onClick={() => { onAdminAddTrainer(tr.id); setTrainerPickerOpen(false) }}
                        className="block w-full text-left px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        {tr.name}
                      </button>
                    ))}
                  {availableTrainers.filter((tr) => !assignedIds.has(tr.id)).length === 0 && (
                    <p className="text-xs text-zinc-600 px-3 py-1.5">Inga tillgängliga</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Trainer: assign/remove self */}
        {user?.role === 'TRAINER' && (
          <button
            onClick={onAssignSelf}
            className={`mt-2 text-xs px-2.5 py-1 rounded-md border transition-colors ${
              isSelfAssigned
                ? 'border-red-700/50 text-red-400 hover:bg-red-900/20'
                : 'border-brand/40 text-brand hover:bg-brand/10'
            }`}
          >
            {isSelfAssigned ? t('sess_remove_self') : t('sess_assign_self')}
          </button>
        )}
      </div>

      {/* Capacity bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-600 mb-1">
          <span>{session.checkInCount}/{session.maxCapacity} {t('sess_capacity')}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Attendees — visible to logged-in users for today's sessions */}
      {isToday && session.attendees !== null && (
        <div className="mb-4">
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-1.5">{t('sched_attendees')}</p>
          {session.attendees.length === 0 ? (
            <p className="text-xs text-zinc-700">—</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {session.attendees.map(a => (
                <span key={a.id} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Check-in button */}
      {isToday ? (
        <button
          disabled={checkInLoading}
          onClick={() => {
            setCheckInLoading(true)
            Promise.resolve(onCheckIn(session)).finally(() => setCheckInLoading(false))
          }}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            session.checkedIn
              ? 'bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30'
              : 'bg-brand hover:bg-brand-hover text-white'
          } disabled:opacity-60`}
        >
          {checkInLoading ? '...' : session.checkedIn ? t('sched_cancel_checkin') : t('sched_checkin')}
        </button>
      ) : (
        <div className="w-full py-2.5 rounded-lg text-sm text-center text-zinc-600 bg-zinc-800/50">
          {t('sched_not_available')}
        </div>
      )}
    </div>
  )
}
