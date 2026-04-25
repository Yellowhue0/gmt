'use client'

import { useEffect, useState, useCallback } from 'react'
import { Camera, CheckCircle2, AlertCircle, User, Flame, Trophy, Star, Calendar, Zap } from 'lucide-react'
import RoleBadge from '@/components/RoleBadge'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'

const MAX_BIO = 200
const MAX_NAME_CHANGES = 2

type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  bio: string | null
  avatarUrl: string | null
  usernameChangesCount: number
  membershipPaid: boolean
  membershipEnd: string | null
  swishNumber: string | null
  phone: string | null
  createdAt: string
  currentWeight: number | null
  fullName: string | null
}

type Toast = { type: 'success' | 'error'; message: string }

type Stats = {
  total: number
  thisWeek: number
  thisMonth: number
  longestStreak: number
  currentStreak: number
  favoriteClass: string | null
  firstCheckIn: string | null
}

type WeekActivity = { monday: string; count: number; label: string }

type CheckInItem = {
  id: string
  date: string
  session: {
    name: string
    startTime: string
    endTime: string
    trainer: { name: string } | null
  }
}

type HistoryData = {
  stats: Stats
  weeklyActivity: WeekActivity[]
  availableMonths: string[]
  history: { items: CheckInItem[]; total: number; page: number; pages: number }
}

type BadgeItem = {
  id: string
  name: string
  description: string
  icon: string
  category: string
  isSecret: boolean
  earned: boolean
  earnedAt: string | null
  userBadgeId: string | null
}

type AchievementsData = {
  totalPoints: number
  currentSeasonPoints: number
  attendanceStreak: number
  longestStreak: number
  totalCheckIns: number
  badges: BadgeItem[]
  nextMilestone: number | null
  prevMilestone: number
  progressPct: number
}

// ── Activity bar chart ──────────────────────────────────────────────────────

function ActivityChart({ weeks, t }: { weeks: WeekActivity[]; t: (k: TranslationKey) => string }) {
  const max = Math.max(...weeks.map(w => w.count), 1)
  return (
    <div>
      <div className="flex items-end gap-1.5 h-20">
        {weeks.map(w => {
          const pct = w.count === 0 ? 4 : Math.max(12, Math.round((w.count / max) * 100))
          const intensity = w.count === 0 ? 0 : 0.25 + (w.count / max) * 0.75
          return (
            <div key={w.monday} className="flex-1 flex flex-col items-center gap-1 h-full" title={`${w.label}: ${w.count} ${t('prof_checkin_count')}`}>
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: w.count === 0
                      ? '#27272a'
                      : `rgba(161, 30, 0, ${intensity})`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {/* Week labels — show only every 3rd to avoid cramping */}
      <div className="flex gap-1.5 mt-1.5">
        {weeks.map((w, i) => (
          <div key={w.monday} className="flex-1 text-center">
            {i % 3 === 0 && (
              <span className="text-[9px] text-zinc-600 block truncate">{w.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${accent ? 'border-brand/50 bg-brand/5' : 'border-zinc-800 bg-zinc-900'}`}>
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <span className={`text-2xl font-bold ${accent ? 'text-brand' : 'text-white'}`}>{value}</span>
        {sub && <span className="text-zinc-500 text-xs ml-1.5">{sub}</span>}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [weight, setWeight] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const { t } = useLanguage()

  const [histData, setHistData] = useState<HistoryData | null>(null)
  const [histLoading, setHistLoading] = useState(true)
  const [histPage, setHistPage] = useState(1)
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [achievements, setAchievements] = useState<AchievementsData | null>(null)
  const [badgeTooltip, setBadgeTooltip] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const u = d.data as UserProfile | null
        if (u) { setProfile(u); setName(u.name); setBio(u.bio ?? ''); setWeight(u.currentWeight?.toString() ?? ''); setFullName(u.fullName ?? '') }
        setLoading(false)
      })
  }, [])

  const loadStats = useCallback((page: number, month: string) => {
    setHistLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (month) params.set('month', month)
    fetch(`/api/profile/stats?${params}`)
      .then(r => r.json())
      .then(d => { if (d.data) setHistData(d.data) })
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [])

  useEffect(() => { loadStats(1, '') }, [loadStats])

  useEffect(() => {
    fetch('/api/profile/achievements')
      .then(r => r.json())
      .then(d => { if (d.data) setAchievements(d.data) })
      .catch(() => {})
  }, [])

  const applyFilter = (month: string) => {
    setMonthFilter(month)
    setHistPage(1)
    loadStats(1, month)
  }

  const goPage = (p: number) => {
    setHistPage(p)
    loadStats(p, monthFilter)
  }

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const saveFullName = async () => {
    if (!profile || fullName.trim() === (profile.fullName ?? '')) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: fullName.trim() || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, fullName: data.data.fullName } : prev)
      showToast('success', t('prof_fullname_saved'))
    } else {
      showToast('error', data.error ?? t('prof_error'))
    }
    setSaving(false)
  }

  const saveWeight = async () => {
    if (!profile) return
    const val = weight.trim() === '' ? null : parseFloat(weight)
    if (val === profile.currentWeight) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentWeight: val }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, currentWeight: data.data.currentWeight } : prev)
      showToast('success', t('prof_weight_saved'))
    } else {
      showToast('error', data.error ?? t('prof_error'))
    }
    setSaving(false)
  }

  const saveBio = async () => {
    if (!profile || bio === (profile.bio ?? '')) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, bio: data.data.bio } : prev)
      showToast('success', t('prof_bio_saved'))
    } else {
      showToast('error', data.error ?? t('prof_error'))
    }
    setSaving(false)
  }

  const saveName = async () => {
    if (!profile || name === profile.name) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, name: data.data.name, usernameChangesCount: data.data.usernameChangesCount } : prev)
      showToast('success', t('prof_name_saved'))
    } else {
      showToast('error', data.error ?? t('prof_error'))
    }
    setSaving(false)
  }

  if (loading) return <div className="text-zinc-600 text-center py-20">{t('adm_loading')}</div>
  if (!profile) return null

  const changesLeft = MAX_NAME_CHANGES - profile.usernameChangesCount
  const nameReadOnly = changesLeft <= 0
  const expiry = profile.membershipEnd ? new Date(profile.membershipEnd) : null
  const stats = histData?.stats

  const ROLE_LABEL: Record<string, string> = {
    ADMIN: t('adm_role_admin'),
    TRAINER: t('adm_role_trainer'),
    FIGHTER: t('adm_role_fighter'),
    FINANCE: t('adm_role_finance'),
    MEMBER: t('adm_role_member'),
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-300 border border-green-700' : 'bg-red-900/90 text-red-300 border border-red-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {t('prof_title')}
        </h1>
        <p className="text-zinc-500">{t('prof_sub')}</p>
      </div>

      {/* Profile picture */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-5">{t('prof_picture')}</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-zinc-600" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-zinc-700 rounded-full border-2 border-zinc-900 flex items-center justify-center">
              <Camera size={12} className="text-zinc-400" />
            </div>
          </div>
          <div>
            <button
              disabled
              className="px-4 py-2 bg-zinc-800 text-zinc-500 text-sm rounded-lg border border-zinc-700 cursor-not-allowed opacity-60 mb-1"
            >
              {t('prof_upload')}
            </button>
            <p className="text-zinc-700 text-xs">{t('prof_coming_soon')}</p>
          </div>
        </div>
      </div>

      {/* Role & account info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">{t('prof_account')}</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('dash_email')}</span>
            <span className="text-zinc-300">{profile.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('dash_role')}</span>
            <div className="flex items-center gap-2">
              <RoleBadge role={profile.role} size="md" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('prof_membership')}</span>
            <span className={profile.membershipPaid ? 'text-green-400' : 'text-yellow-500'}>
              {profile.membershipPaid
                ? `${t('adm_paid')}${expiry ? ` · ${formatDate(expiry)}` : ''}`
                : t('adm_unpaid_status')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('prof_member_since')}</span>
            <span className="text-zinc-400">{formatDate(new Date(profile.createdAt))}</span>
          </div>
        </div>
      </div>

      {/* Username */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('prof_username')}</h2>
        <p className="text-zinc-600 text-xs mb-4">
          {nameReadOnly ? t('prof_name_used_up') : t('prof_name_remaining').replace('{n}', String(changesLeft))}
        </p>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            readOnly={nameReadOnly}
            className={`flex-1 bg-zinc-800 border text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors ${
              nameReadOnly
                ? 'border-zinc-700 text-zinc-600 cursor-not-allowed'
                : 'border-zinc-700 text-white focus:border-brand'
            }`}
          />
          {!nameReadOnly && (
            <button
              onClick={saveName}
              disabled={saving || name === profile.name || !name.trim()}
              className="px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t('prof_save')}
            </button>
          )}
        </div>
        {!nameReadOnly && (
          <div className="mt-2 flex gap-1">
            {Array.from({ length: MAX_NAME_CHANGES }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${i < profile.usernameChangesCount ? 'bg-zinc-600' : 'bg-brand'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full name */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('prof_fullname_label')}</h2>
        <p className="text-zinc-600 text-xs mb-4">{t('prof_fullname_hint')}</p>
        <div className="flex gap-3">
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="—"
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
          />
          <button
            onClick={saveFullName}
            disabled={saving || fullName.trim() === (profile.fullName ?? '')}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t('prof_save')}
          </button>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('prof_bio_label')}</h2>
        <p className="text-zinc-600 text-xs mb-4">{t('prof_bio_hint')}</p>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, MAX_BIO))}
          rows={4}
          placeholder={t('prof_bio_placeholder')}
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand resize-none placeholder:text-zinc-600 mb-2"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${bio.length >= MAX_BIO ? 'text-red-400' : 'text-zinc-600'}`}>
            {bio.length} / {MAX_BIO}
          </span>
          <button
            onClick={saveBio}
            disabled={saving || bio === (profile.bio ?? '')}
            className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t('prof_save')}
          </button>
        </div>
      </div>

      {/* Weight */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('prof_weight_label')}</h2>
        <p className="text-zinc-600 text-xs mb-4">{t('fight_current_weight')} (kg)</p>
        <div className="flex gap-3">
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="—"
            className="w-32 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
          />
          <button
            onClick={saveWeight}
            disabled={saving || (weight.trim() === '' ? null : parseFloat(weight)) === profile.currentWeight}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t('prof_save')}
          </button>
        </div>
      </div>

      {/* ── Training Statistics ─────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-5">{t('prof_stats_title')}</h2>

        {histLoading && !histData ? (
          <p className="text-zinc-600 text-sm">{t('prof_history_loading')}</p>
        ) : stats && stats.total > 0 ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                icon={<Trophy size={13} />}
                label={t('prof_stats_total')}
                value={stats.total}
                sub={t('prof_checkin_count')}
                accent
              />
              <StatCard
                icon={<Calendar size={13} />}
                label={t('prof_stats_month')}
                value={stats.thisMonth}
              />
              <StatCard
                icon={<Calendar size={13} />}
                label={t('prof_stats_week')}
                value={stats.thisWeek}
              />
              <StatCard
                icon={<Flame size={13} />}
                label={t('prof_stats_streak_current')}
                value={stats.currentStreak}
                sub={t('prof_stats_weeks')}
                accent={stats.currentStreak > 0}
              />
            </div>

            {/* Secondary stats */}
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                <span className="text-zinc-500 flex items-center gap-2">
                  <Trophy size={12} />
                  {t('prof_stats_streak_best')}
                </span>
                <span className="text-white font-medium">{stats.longestStreak} {t('prof_stats_weeks')}</span>
              </div>
              {stats.favoriteClass && (
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 flex items-center gap-2">
                    <Star size={12} />
                    {t('prof_stats_fav')}
                  </span>
                  <span className="text-white font-medium truncate max-w-[55%] text-right">{stats.favoriteClass}</span>
                </div>
              )}
              {stats.firstCheckIn && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500 flex items-center gap-2">
                    <Calendar size={12} />
                    {t('prof_stats_first')}
                  </span>
                  <span className="text-zinc-400">{formatDate(stats.firstCheckIn)}</span>
                </div>
              )}
            </div>

            {/* Activity chart */}
            {histData && histData.weeklyActivity.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">{t('prof_activity_title')}</p>
                <ActivityChart weeks={histData.weeklyActivity} t={t} />
              </div>
            )}
          </>
        ) : (
          <p className="text-zinc-600 text-sm">{t('prof_stats_none')}</p>
        )}
      </div>

      {/* ── Points & Achievements ──────────────────────────────────── */}
      {achievements && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-5">Points & Achievements</h2>

          {/* Points summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-brand/40 bg-brand/5 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                <Trophy size={12} />
                <span className="text-[10px] uppercase tracking-wider">Total Points</span>
              </div>
              <div className="text-2xl font-bold text-brand">{achievements.totalPoints.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                <Star size={12} />
                <span className="text-[10px] uppercase tracking-wider">This Season</span>
              </div>
              <div className="text-2xl font-bold text-white">{achievements.currentSeasonPoints.toLocaleString()}</div>
            </div>
            <div className={`rounded-xl border p-3 text-center ${achievements.attendanceStreak > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
              <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                <Flame size={12} className={achievements.attendanceStreak > 0 ? 'text-orange-400' : ''} />
                <span className="text-[10px] uppercase tracking-wider">Streak</span>
              </div>
              <div className={`text-2xl font-bold ${achievements.attendanceStreak > 0 ? 'text-orange-400' : 'text-white'}`}>
                {achievements.attendanceStreak}
                <span className="text-sm font-normal text-zinc-500 ml-1">wks</span>
              </div>
            </div>
          </div>

          {/* Progress bar to next milestone */}
          {achievements.nextMilestone && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>{achievements.totalCheckIns} / {achievements.nextMilestone} check-ins</span>
                <span>{achievements.nextMilestone - achievements.totalCheckIns} to go</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${achievements.progressPct}%` }}
                />
              </div>
              <p className="text-zinc-600 text-xs mt-1">
                {achievements.nextMilestone - achievements.totalCheckIns} check-ins until next milestone badge
              </p>
            </div>
          )}

          {/* Badge grid */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Badge Collection</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {achievements.badges.map(badge => {
                const showAsSecret = badge.isSecret && !badge.earned
                const key = badge.id
                return (
                  <div
                    key={key}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border cursor-default transition-all group ${
                      badge.earned
                        ? 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-600'
                        : 'border-zinc-800/60 bg-zinc-900/30 opacity-40'
                    }`}
                    onMouseEnter={() => setBadgeTooltip(badge.id)}
                    onMouseLeave={() => setBadgeTooltip(null)}
                  >
                    <span className="text-2xl">{showAsSecret ? '❓' : badge.icon}</span>
                    <span className="text-[9px] text-zinc-500 text-center leading-tight line-clamp-2">
                      {showAsSecret ? '???' : badge.name}
                    </span>
                    {badge.earned && badge.earnedAt && (
                      <span className="text-[8px] text-zinc-600">{new Date(badge.earnedAt).toLocaleDateString('sv-SE')}</span>
                    )}

                    {/* Tooltip */}
                    {badgeTooltip === badge.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 z-10 shadow-xl pointer-events-none">
                        <p className="text-white text-xs font-semibold mb-0.5">
                          {showAsSecret ? '???' : badge.name}
                        </p>
                        <p className="text-zinc-400 text-[10px] leading-relaxed">
                          {showAsSecret ? 'Keep training to discover this secret badge!' : badge.description}
                        </p>
                        {badge.earned && badge.earnedAt && (
                          <p className="text-zinc-600 text-[9px] mt-1">
                            Earned {new Date(badge.earnedAt).toLocaleDateString('sv-SE')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Session History ─────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider">{t('prof_history_title')}</h2>

          {histData && histData.availableMonths.length > 0 && (
            <select
              value={monthFilter}
              onChange={e => applyFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand"
            >
              <option value="">{t('prof_history_all')}</option>
              {histData.availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>

        {histLoading ? (
          <p className="text-zinc-600 text-sm py-4">{t('prof_history_loading')}</p>
        ) : !histData || histData.history.items.length === 0 ? (
          <p className="text-zinc-600 text-sm py-4">{t('prof_history_empty')}</p>
        ) : (
          <>
            <div className="divide-y divide-zinc-800">
              {histData.history.items.map(item => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{item.session.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {formatDate(item.date)} · {item.session.startTime}–{item.session.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-600 text-xs">{t('prof_history_trainer')}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {item.session.trainer?.name ?? t('prof_history_no_trainer')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {histData.history.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-2">
                <button
                  onClick={() => goPage(histPage - 1)}
                  disabled={histPage <= 1}
                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {t('prof_history_prev')}
                </button>
                <span className="text-xs text-zinc-600">
                  {t('prof_history_page')} {histData.history.page} {t('prof_history_of')} {histData.history.pages}
                </span>
                <button
                  onClick={() => goPage(histPage + 1)}
                  disabled={histPage >= histData.history.pages}
                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {t('prof_history_next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
