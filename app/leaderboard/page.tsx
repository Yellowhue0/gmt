'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Trophy, Medal, Star, Users, Flame, ChevronDown, Info } from 'lucide-react'
import RoleBadge from '@/components/RoleBadge'

type LeaderboardEntry = {
  rank: number
  userId: string
  name: string
  role: string
  points: number
  attendanceCount: number
  badgeCount: number
  isCurrentUser: boolean
}

type Season = {
  id: string
  name: string
  isActive: boolean
  startDate: string
  endDate: string
  topThree: string | null
}

type LeaderboardData = {
  season: Season | null
  seasons: Season[]
  entries: LeaderboardEntry[]
  allTime: boolean
}

type TopThreeWinner = { rank: number; userId: string; name: string; points: number }

function PodiumCard({ entry, pos }: { entry: LeaderboardEntry; pos: 1 | 2 | 3 }) {
  const configs = {
    1: { medal: '🥇', bg: 'bg-yellow-500/10 border-yellow-500/40', text: 'text-yellow-400', height: 'h-28', label: '1st Place' },
    2: { medal: '🥈', bg: 'bg-zinc-400/10 border-zinc-400/40', text: 'text-zinc-300', height: 'h-20', label: '2nd Place' },
    3: { medal: '🥉', bg: 'bg-orange-700/10 border-orange-700/40', text: 'text-orange-400', height: 'h-16', label: '3rd Place' },
  }
  const c = configs[pos]
  return (
    <div className={`flex flex-col items-center gap-2 ${pos === 2 ? 'order-first' : pos === 3 ? 'order-last' : ''}`}>
      <div className={`w-full border rounded-xl p-4 text-center ${c.bg} ${entry.isCurrentUser ? 'ring-2 ring-brand' : ''}`}>
        <div className="text-3xl mb-1">{c.medal}</div>
        <p className={`font-bold text-sm ${c.text}`}>{entry.name}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <RoleBadge role={entry.role} size="sm" />
        </div>
        <p className={`text-2xl font-bold mt-2 ${c.text}`}>{entry.points.toLocaleString()}</p>
        <p className="text-zinc-600 text-xs">pts</p>
        <div className="flex justify-center gap-3 mt-2 text-xs text-zinc-500">
          <span>{entry.attendanceCount} classes</span>
          <span>{entry.badgeCount} badges</span>
        </div>
      </div>
      <div className={`${c.height} w-px bg-zinc-800`} />
      <span className="text-zinc-600 text-xs">{c.label}</span>
    </div>
  )
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'FIGHTER'>('ALL')
  const [allTime, setAllTime] = useState(false)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [showPastSeasons, setShowPastSeasons] = useState(false)
  const [showPointsInfo, setShowPointsInfo] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (allTime) params.set('allTime', '1')
    if (selectedSeasonId) params.set('seasonId', selectedSeasonId)
    if (roleFilter === 'FIGHTER') params.set('role', 'FIGHTER')
    const res = await fetch(`/api/leaderboard?${params}`)
    if (res.ok) {
      const { data } = await res.json()
      setData(data)
    }
    setLoading(false)
  }, [allTime, selectedSeasonId, roleFilter])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  const filtered = (data?.entries ?? []).filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  )

  const top3 = filtered.filter(e => e.rank <= 3 && !search)
  const rest = filtered.filter(e => e.rank > 3 || !!search)
  const myEntry = data?.entries.find(e => e.isCurrentUser)
  const myEntryInRest = rest.find(e => e.isCurrentUser)
  const pastSeasons = (data?.seasons ?? []).filter(s => !s.isActive)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/30 text-brand text-xs font-medium mb-4 uppercase tracking-widest">
          Season Rankings
        </div>
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          🏆 Leaderboard
        </h1>
        <p className="text-zinc-500">
          {data?.season ? data.season.name : 'All Time'} Rankings
        </p>
      </div>

      {/* Points info */}
      <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPointsInfo(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info size={14} className="text-brand" />
            How points are earned
          </span>
          <ChevronDown size={14} className={`transition-transform ${showPointsInfo ? 'rotate-180' : ''}`} />
        </button>
        {showPointsInfo && (
          <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm border-t border-zinc-800 pt-3">
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Regular class</span><span className="text-white font-medium">+10 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Sparring class</span><span className="text-white font-medium">+12 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Fighters class</span><span className="text-white font-medium">+15 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Competition entry</span><span className="text-white font-medium">+25 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Fight loss</span><span className="text-white font-medium">+20 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Fight draw</span><span className="text-white font-medium">+30 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">Fight win</span><span className="text-white font-medium">+50 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">4-week streak</span><span className="text-white font-medium">+20 pts</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-400">8-week streak</span><span className="text-white font-medium">+50 pts</span></div>
            <div className="flex justify-between gap-2 col-span-2 sm:col-span-1"><span className="text-zinc-400">12-week streak</span><span className="text-white font-medium">+100 pts</span></div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'FIGHTER'] as const).map(f => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === f ? 'bg-brand text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All Members' : 'Fighters Only'}
            </button>
          ))}
          <button
            onClick={() => { setAllTime(false); setSelectedSeasonId(null) }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              !allTime && !selectedSeasonId ? 'bg-brand text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            This Season
          </button>
          <button
            onClick={() => { setAllTime(true); setSelectedSeasonId(null) }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              allTime ? 'bg-brand text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* My position banner (if outside top list) */}
      {myEntry && !myEntryInRest && !top3.find(e => e.isCurrentUser) && (
        <div className="mb-6 bg-brand/10 border border-brand/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-brand text-sm font-medium">Your position: #{myEntry.rank}</span>
          <span className="text-white font-bold">{myEntry.points.toLocaleString()} pts</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-zinc-600">Loading leaderboard...</div>
      ) : (

        <>
          {/* Podium (top 3, no search filter) */}
          {top3.length > 0 && !search && (
            <div className="mb-10">
              <div className="grid grid-cols-3 gap-4 items-end">
                {([2, 1, 3] as const).map(pos => {
                  const entry = top3.find(e => e.rank === pos)
                  if (!entry) return <div key={pos} />
                  return <PodiumCard key={pos} entry={entry} pos={pos} />
                })}
              </div>
            </div>
          )}

          {/* Full ranked list */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Full Rankings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider">Rank</th>
                    <th className="text-left px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider">Role</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider">Points</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider">Classes</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider">Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {(search ? filtered : rest).map(entry => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-zinc-800/50 transition-colors ${
                        entry.isCurrentUser
                          ? 'bg-brand/10 hover:bg-brand/15'
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${entry.rank <= 3 ? 'text-brand' : 'text-zinc-500'}`}>
                          {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-medium ${entry.isCurrentUser ? 'text-brand' : 'text-white'}`}>
                            {entry.name}
                            {entry.isCurrentUser && <span className="ml-1 text-xs text-brand">(you)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={entry.role} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-white">{entry.points.toLocaleString()}</span>
                        <span className="text-zinc-600 text-xs ml-1">pts</span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">{entry.attendanceCount}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{entry.badgeCount}</td>
                    </tr>
                  ))}
                  {(search ? filtered : rest).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-zinc-600 text-sm">
                        {search ? 'No members match your search.' : 'No rankings yet — start training!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past Seasons / Hall of Fame */}
          {pastSeasons.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowPastSeasons(v => !v)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium mb-4 transition-colors"
              >
                <Trophy size={14} className="text-brand" />
                Hall of Fame – Past Seasons
                <ChevronDown size={14} className={`transition-transform ${showPastSeasons ? 'rotate-180' : ''}`} />
              </button>

              {showPastSeasons && (
                <div className="space-y-4">
                  {/* Past season selector */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pastSeasons.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setAllTime(false); setSelectedSeasonId(s.id) }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedSeasonId === s.id
                            ? 'bg-brand text-white'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>

                  {/* Top 3 per past season */}
                  <div className="grid gap-4">
                    {pastSeasons.map(season => {
                      if (!season.topThree) return null
                      let winners: TopThreeWinner[] = []
                      try { winners = JSON.parse(season.topThree) } catch { return null }
                      return (
                        <div key={season.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <h3 className="text-sm font-semibold text-zinc-300 mb-3">{season.name}</h3>
                          <div className="flex flex-wrap gap-3">
                            {winners.map(w => (
                              <div key={w.rank} className="flex items-center gap-2 text-sm">
                                <span>{w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}</span>
                                <span className="text-white font-medium">{w.name}</span>
                                <span className="text-zinc-500">{w.points.toLocaleString()} pts</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
