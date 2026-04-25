'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sword, Trophy, Shield, AlertTriangle, CheckCircle2, XCircle, Calendar, Weight, BarChart2, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type CompEntry = {
  id: string
  event: { id: string; title: string; date: string; location: string | null }
  weightAtEntry: number | null
  opponent: string | null
  result: string | null
  notes: string | null
}

type FighterProfile = {
  id: string
  name: string
  avatarUrl: string | null
  fighterCardNumber: string | null
  fighterCardExpiry: string | null
  weightClass: string | null
  currentWeight: number | null
  wins: number
  losses: number
  draws: number
  _count: { checkIns: number }
  competitionEntries: CompEntry[]
}

function resultColor(r: string | null) {
  if (r === 'WIN') return 'text-green-400 bg-green-900/30 border-green-800/40'
  if (r === 'LOSS') return 'text-red-400 bg-red-900/30 border-red-800/40'
  if (r === 'DRAW') return 'text-yellow-400 bg-yellow-900/30 border-yellow-800/40'
  if (r === 'NO_CONTEST') return 'text-zinc-400 bg-zinc-800 border-zinc-700'
  return 'text-zinc-500 bg-zinc-800/60 border-zinc-700'
}

function resultLabel(r: string | null) {
  if (r === 'WIN') return 'Vinst'
  if (r === 'LOSS') return 'Förlust'
  if (r === 'DRAW') return 'Oavgjort'
  if (r === 'NO_CONTEST') return 'No Contest'
  return 'Ej spelad'
}

function CardStatus({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span className="flex items-center gap-1.5 text-zinc-500"><Shield size={14} /> Inget fighterkort</span>
  const daysLeft = (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return <span className="flex items-center gap-1.5 text-red-400"><XCircle size={14} /> Utgånget</span>
  if (daysLeft <= 30) return <span className="flex items-center gap-1.5 text-yellow-400"><AlertTriangle size={14} /> Löper ut snart ({Math.ceil(daysLeft)} dagar)</span>
  return <span className="flex items-center gap-1.5 text-green-400"><CheckCircle2 size={14} /> Giltigt</span>
}

function FighterProfileContent() {
  const searchParams = useSearchParams()
  const fighterId = searchParams.get('id')
  const { t } = useLanguage()

  const [fighter, setFighter] = useState<FighterProfile | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.data) { setError('Inte inloggad'); setLoading(false); return }
        const id = d.data.id
        const role = d.data.role
        setMyId(id)
        setMyRole(role)
        const targetId = fighterId ?? id
        return fetch(`/api/fighters/${targetId}`).then(r => r.json())
      })
      .then(d => {
        if (d?.data) setFighter(d.data)
        else if (d?.error) setError(d.error)
        setLoading(false)
      })
      .catch(() => { setError('Något gick fel'); setLoading(false) })
  }, [fighterId])

  if (loading) return <div className="text-zinc-600 text-center py-20">Laddar...</div>
  if (error) return <div className="text-red-400 text-center py-20">{error}</div>
  if (!fighter) return null

  const now = new Date()
  const upcoming = fighter.competitionEntries.filter(e => new Date(e.event.date) >= now)
    .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime())
  const past = fighter.competitionEntries.filter(e => new Date(e.event.date) < now)
    .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())

  const isOwnProfile = myId === fighter.id
  const isStaff = myRole === 'ADMIN' || myRole === 'TRAINER'
  const initials = fighter.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {isStaff && !isOwnProfile && (
        <Link href="/dashboard/admin/fighters" className="text-sm text-zinc-500 hover:text-zinc-300 mb-6 inline-flex items-center gap-1.5 transition-colors">
          ← Alla fighters
        </Link>
      )}

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-brand/20 border-2 border-brand/30 flex items-center justify-center text-brand font-bold text-xl">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {fighter.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
              {fighter.weightClass && (
                <span className="flex items-center gap-1"><Weight size={13} /> {fighter.weightClass}</span>
              )}
              {fighter.currentWeight && (
                <span>{fighter.currentWeight} kg</span>
              )}
            </div>
          </div>
        </div>

        {/* Record */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: t('fight_wins_label'), value: fighter.wins, color: 'text-green-400' },
            { label: t('fight_losses_label'), value: fighter.losses, color: 'text-red-400' },
            { label: t('fight_draws_label'), value: fighter.draws, color: 'text-yellow-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Card status */}
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500 mb-1">{t('fight_card_label')}</p>
          <div className="flex items-center justify-between">
            <CardStatus expiry={fighter.fighterCardExpiry} />
            {fighter.fighterCardNumber && (
              <span className="text-xs text-zinc-600 font-mono"># {fighter.fighterCardNumber}</span>
            )}
          </div>
          {fighter.fighterCardExpiry && (
            <p className="text-xs text-zinc-600 mt-1">{t('fight_expires')}: {formatDate(new Date(fighter.fighterCardExpiry))}</p>
          )}
        </div>
      </div>

      {/* Upcoming competitions */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-brand" /> {t('fight_profile_upcoming')}
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-600 text-sm">{t('fight_no_next_fight')}</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(entry => (
              <div key={entry.id} className="bg-zinc-900 border border-brand/20 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{entry.event.title}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{formatDate(new Date(entry.event.date))}</p>
                    {entry.event.location && <p className="text-zinc-600 text-xs">{entry.event.location}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${resultColor(entry.result)}`}>
                    {resultLabel(entry.result)}
                  </span>
                </div>
                {(entry.opponent || entry.weightAtEntry) && (
                  <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                    {entry.opponent && <span>vs {entry.opponent}</span>}
                    {entry.weightAtEntry && <span>{t('fight_weight_at_entry').replace(' (kg)', '')}: {entry.weightAtEntry} kg</span>}
                  </div>
                )}
                {entry.notes && <p className="mt-2 text-xs text-zinc-600 italic">{entry.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past results */}
      {past.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-brand" /> {t('fight_profile_past')}
          </h2>
          <div className="space-y-2">
            {past.map(entry => (
              <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{entry.event.title}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {formatDate(new Date(entry.event.date))}
                    {entry.opponent && ` · vs ${entry.opponent}`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${resultColor(entry.result)}`}>
                  {resultLabel(entry.result)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fighter.competitionEntries.length === 0 && (
        <p className="text-zinc-600 text-sm mb-6">{t('fight_profile_no_history')}</p>
      )}

      {/* Training stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart2 size={14} /> {t('fight_attendance_title')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-white">{fighter._count.checkIns}</span>
          <span className="text-zinc-500 text-sm">{t('fight_total_checkins')}</span>
        </div>
      </div>
    </div>
  )
}

export default function FighterProfilePage() {
  return (
    <Suspense fallback={<div className="text-zinc-600 text-center py-20">Laddar...</div>}>
      <FighterProfileContent />
    </Suspense>
  )
}
