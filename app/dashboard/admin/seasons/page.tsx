'use client'

import { useEffect, useState } from 'react'
import { Plus, Trophy, X, AlertTriangle, Star, Award } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  topThree: string | null
  _count: { leaderboard: number }
}

type Member = { id: string; name: string; role: string }
type Badge = { id: string; name: string; icon: string; category: string }
type Toast = { type: 'success' | 'error'; message: string }

type TopThreeWinner = { rank: number; name: string; points: number }

function showToastFor(setToast: (t: Toast | null) => void, type: Toast['type'], message: string) {
  setToast({ type, message })
  setTimeout(() => setToast(null), 3500)
}

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)

  // Create season
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [creating, setCreating] = useState(false)

  // End season
  const [endingId, setEndingId] = useState<string | null>(null)

  // Award points
  const [pointsUserId, setPointsUserId] = useState('')
  const [pointsAmt, setPointsAmt] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [awardingPoints, setAwardingPoints] = useState(false)

  // Award badge
  const [badgeUserId, setBadgeUserId] = useState('')
  const [badgeName, setBadgeName] = useState('')
  const [badgeNote, setBadgeNote] = useState('')
  const [awardingBadge, setAwardingBadge] = useState(false)

  const notify = (type: Toast['type'], msg: string) => showToastFor(setToast, type, msg)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/seasons').then(r => r.json()),
      fetch('/api/admin/members').then(r => r.json()),
      fetch('/api/admin/badges').then(r => r.json()),
    ]).then(([s, m, b]) => {
      setSeasons(s.data ?? [])
      setMembers((m.data ?? []).filter((u: Member & { isConfirmed?: boolean }) => u.isConfirmed !== false))
      setBadges(b.data ?? [])
      setLoading(false)
    })
  }, [])

  const createSeason = async () => {
    if (!newName || !newStart || !newEnd) return
    setCreating(true)
    const res = await fetch('/api/admin/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, startDate: newStart, endDate: newEnd }),
    })
    const { data } = await res.json()
    if (res.ok) {
      setSeasons(prev => [{ ...data, _count: { leaderboard: 0 } }, ...prev])
      setNewName(''); setNewStart(''); setNewEnd('')
      setShowCreate(false)
      notify('success', `Season "${data.name}" created!`)
    } else {
      notify('error', data.error ?? 'Failed to create season')
    }
    setCreating(false)
  }

  const endSeason = async (id: string) => {
    if (!confirm('End this season? This will freeze the leaderboard, record top 3, and reset season points for all members.')) return
    setEndingId(id)
    const res = await fetch(`/api/admin/seasons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    })
    if (res.ok) {
      setSeasons(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s))
      notify('success', 'Season ended. All members notified!')
    } else {
      notify('error', 'Failed to end season')
    }
    setEndingId(null)
  }

  const awardPoints = async () => {
    if (!pointsUserId || !pointsAmt || !pointsReason) return
    setAwardingPoints(true)
    const res = await fetch('/api/admin/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pointsUserId, points: pointsAmt, reason: pointsReason }),
    })
    if (res.ok) {
      setPointsUserId(''); setPointsAmt(''); setPointsReason('')
      notify('success', 'Points awarded!')
    } else {
      const { error } = await res.json()
      notify('error', error ?? 'Failed')
    }
    setAwardingPoints(false)
  }

  const awardBadgeToMember = async () => {
    if (!badgeUserId || !badgeName) return
    setAwardingBadge(true)
    const res = await fetch('/api/admin/badges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: badgeUserId, badgeName, note: badgeNote || undefined }),
    })
    if (res.ok) {
      setBadgeUserId(''); setBadgeName(''); setBadgeNote('')
      notify('success', 'Badge awarded!')
    } else {
      notify('error', 'Failed to award badge (already earned?)')
    }
    setAwardingBadge(false)
  }

  const activeSeason = seasons.find(s => s.isActive)
  const pastSeasons = seasons.filter(s => !s.isActive)

  if (loading) return <div className="text-zinc-600 text-center py-20">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-300 border border-green-700' : 'bg-red-900/90 text-red-300 border border-red-700'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Season Management
          </h1>
          <p className="text-zinc-500">Manage seasons, award points and badges</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Season
        </button>
      </div>

      {/* Create season form */}
      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Create New Season</h2>
            <button onClick={() => setShowCreate(false)} className="text-zinc-600 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Season Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. 2027 Season"
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
              <input
                type="date"
                value={newStart}
                onChange={e => setNewStart(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">End Date</label>
              <input
                type="date"
                value={newEnd}
                onChange={e => setNewEnd(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
              />
            </div>
          </div>
          <button
            onClick={createSeason}
            disabled={creating || !newName || !newStart || !newEnd}
            className="px-5 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {creating ? 'Creating...' : 'Create Season'}
          </button>
        </div>
      )}

      {/* Active season */}
      <div className="mb-8">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Active Season</h2>
        {activeSeason ? (
          <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={16} className="text-brand" />
                  <h3 className="text-white font-semibold">{activeSeason.name}</h3>
                  <span className="text-[10px] font-black text-green-400 border border-green-700/60 bg-green-950/50 px-1.5 py-0.5 rounded">ACTIVE</span>
                </div>
                <p className="text-zinc-500 text-sm">
                  {formatDate(activeSeason.startDate)} → {formatDate(activeSeason.endDate)}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{activeSeason._count.leaderboard} members on leaderboard</p>
              </div>
              <button
                onClick={() => endSeason(activeSeason.id)}
                disabled={endingId === activeSeason.id}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border border-red-800/50 text-red-400 hover:bg-red-900/60 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <AlertTriangle size={13} />
                {endingId === activeSeason.id ? 'Ending...' : 'End Season'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center text-zinc-600 text-sm">
            No active season. Create one above.
          </div>
        )}
      </div>

      {/* Award points */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} className="text-yellow-400" />
          <h2 className="text-white font-semibold">Award Bonus Points</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Member</label>
            <select
              value={pointsUserId}
              onChange={e => setPointsUserId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="">Select member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Points</label>
            <input
              type="number"
              min="1"
              max="10000"
              value={pointsAmt}
              onChange={e => setPointsAmt(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Reason (required)</label>
            <input
              value={pointsReason}
              onChange={e => setPointsReason(e.target.value)}
              placeholder="e.g. Volunteer at event"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            />
          </div>
        </div>
        <button
          onClick={awardPoints}
          disabled={awardingPoints || !pointsUserId || !pointsAmt || !pointsReason}
          className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {awardingPoints ? 'Awarding...' : 'Award Points'}
        </button>
      </div>

      {/* Award badge */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-purple-400" />
          <h2 className="text-white font-semibold">Award Badge</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Member</label>
            <select
              value={badgeUserId}
              onChange={e => setBadgeUserId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="">Select member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Badge</label>
            <select
              value={badgeName}
              onChange={e => setBadgeName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="">Select badge...</option>
              {badges.map(b => (
                <option key={b.id} value={b.name}>{b.icon} {b.name} ({b.category})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Note (optional)</label>
            <input
              value={badgeNote}
              onChange={e => setBadgeNote(e.target.value)}
              placeholder="Admin note..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            />
          </div>
        </div>
        <button
          onClick={awardBadgeToMember}
          disabled={awardingBadge || !badgeUserId || !badgeName}
          className="px-5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {awardingBadge ? 'Awarding...' : 'Award Badge'}
        </button>
      </div>

      {/* Past seasons */}
      {pastSeasons.length > 0 && (
        <div>
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Past Seasons</h2>
          <div className="space-y-3">
            {pastSeasons.map(season => {
              let topThree: TopThreeWinner[] = []
              try { if (season.topThree) topThree = JSON.parse(season.topThree) } catch { /* noop */ }
              return (
                <div key={season.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-white font-medium text-sm">{season.name}</span>
                      <span className="text-zinc-600 text-xs ml-2">{formatDate(season.startDate)} → {formatDate(season.endDate)}</span>
                    </div>
                  </div>
                  {topThree.length > 0 && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {topThree.map(w => (
                        <div key={w.rank} className="flex items-center gap-1.5">
                          <span>{w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}</span>
                          <span className="text-zinc-300">{w.name}</span>
                          <span className="text-zinc-600">{w.points.toLocaleString()} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
