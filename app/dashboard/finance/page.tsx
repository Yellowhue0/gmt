'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Search, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { formatDate, MEMBERSHIP_PRICE } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type Member = {
  id: string
  name: string
  email: string
  role: string
  swishNumber: string | null
  membershipPaid: boolean
  membershipExpiry: string | null
  _count: { checkIns: number }
}

type SessionStat = {
  id: string
  name: string
  dayLabel: string
  startTime: string
  type: string
  maxCapacity: number
  _count: { checkIns: number }
}

type TopMember = {
  name: string
  email: string
  role: string
  membershipPaid: boolean
  _count: { checkIns: number }
}

type Tab = 'payments' | 'attendance'

export default function FinancePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [sessions, setSessions] = useState<SessionStat[]>([])
  const [topMembers, setTopMembers] = useState<TopMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('payments')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/members').then(r => r.json()),
      fetch('/api/finance/attendance').then(r => r.json()),
    ]).then(([m, a]) => {
      setMembers(m.data ?? [])
      setSessions(a.data?.sessions ?? [])
      setTopMembers(a.data?.topMembers ?? [])
      setLoading(false)
    })
  }, [])

  const togglePayment = async (member: Member) => {
    setUpdating(member.id)
    const res = await fetch(`/api/finance/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipPaid: !member.membershipPaid }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, ...data } : m))
    }
    setUpdating(null)
  }

  const paid = members.filter(m => m.membershipPaid).length
  const unpaid = members.filter(m => !m.membershipPaid).length
  const revenue = paid * MEMBERSHIP_PRICE

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'paid' && m.membershipPaid) ||
      (filter === 'unpaid' && !m.membershipPaid)
    return matchSearch && matchFilter
  })

  const stats = [
    { label: t('fin_stat_total'), value: members.length, color: 'text-white', icon: <Users size={16} /> },
    { label: t('fin_stat_paid'), value: paid, color: 'text-green-400', icon: <CheckCircle2 size={16} /> },
    { label: t('fin_stat_unpaid'), value: unpaid, color: 'text-yellow-400', icon: <XCircle size={16} /> },
    { label: t('fin_stat_revenue'), value: `${revenue} kr`, color: 'text-brand', icon: <TrendingUp size={16} /> },
  ]

  const payFilters = [
    { key: 'all' as const, label: t('fin_filter_all') },
    { key: 'paid' as const, label: t('fin_filter_paid') },
    { key: 'unpaid' as const, label: t('fin_filter_unpaid') },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {t('fin_title')}
        </h1>
        <p className="text-zinc-500">{t('fin_sub')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, color, icon }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              {icon}
              <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{value}</span>
            </div>
            <div className="text-zinc-600 text-xs uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            tab === 'payments' ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <CheckCircle2 size={14} /> {t('fin_stat_paid')} / {t('fin_stat_unpaid')}
        </button>
        <button
          onClick={() => setTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            tab === 'attendance' ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 size={14} /> {t('fin_attendance_title')}
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-600 text-center py-20">{t('fin_loading')}</div>
      ) : tab === 'payments' ? (
        <>
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('fin_search')}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex gap-2">
              {payFilters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.key ? 'bg-brand text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payments table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {[t('fin_col_name'), t('fin_col_email'), t('fin_col_swish'), t('fin_col_checkins'), t('fin_col_status'), t('fin_col_expires'), t('fin_col_action')].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(member => {
                    const expiry = member.membershipExpiry ? new Date(member.membershipExpiry) : null
                    const isExpiringSoon = expiry && (expiry.getTime() - Date.now()) < 14 * 24 * 60 * 60 * 1000
                    return (
                      <tr key={member.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{member.email}</td>
                        <td className="px-4 py-3 text-zinc-400">{member.swishNumber ?? '–'}</td>
                        <td className="px-4 py-3 text-zinc-400 text-center">{member._count.checkIns}</td>
                        <td className="px-4 py-3">
                          {member.membershipPaid ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs">
                              <CheckCircle2 size={12} /> {t('fin_paid')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-500 text-xs">
                              <XCircle size={12} /> {t('fin_unpaid')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {expiry ? (
                            <span className={`text-xs ${isExpiringSoon ? 'text-yellow-400' : 'text-zinc-400'}`}>
                              {formatDate(expiry)}
                            </span>
                          ) : (
                            <span className="text-zinc-700 text-xs">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => togglePayment(member)}
                            disabled={updating === member.id}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                              member.membershipPaid
                                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                                : 'bg-brand hover:bg-brand-hover text-white'
                            }`}
                          >
                            {updating === member.id ? '...' : member.membershipPaid ? t('fin_revoke') : t('fin_confirm')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-zinc-600 text-sm">{t('fin_no_match')}</div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Attendance tab */
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sessions table */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{t('fin_attendance_title')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {[t('fin_day_col'), t('fin_session_col'), t('fin_capacity_col'), t('fin_total_col')].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => {
                    const pct = Math.min(100, Math.round((s._count.checkIns / Math.max(s.maxCapacity, 1)) * 100))
                    return (
                      <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-500 text-xs font-medium w-12">{s.dayLabel}</td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{s.name}</div>
                          <div className="text-zinc-600 text-xs">{s.startTime}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{s.maxCapacity}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{s._count.checkIns}</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden min-w-[60px]">
                              <div
                                className="h-full bg-brand rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top members */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{t('fin_top_title')}</h2>
            </div>
            <ul className="divide-y divide-zinc-800/50">
              {topMembers.filter(m => m._count.checkIns > 0).map((m, i) => (
                <li key={m.email} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-zinc-600 text-xs w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{m.name}</div>
                    <div className={`text-xs ${m.membershipPaid ? 'text-green-500' : 'text-yellow-500'}`}>
                      {m.membershipPaid ? t('fin_paid') : t('fin_unpaid')}
                    </div>
                  </div>
                  <span className="text-brand font-semibold text-sm shrink-0">{m._count.checkIns}</span>
                </li>
              ))}
              {topMembers.filter(m => m._count.checkIns > 0).length === 0 && (
                <li className="px-4 py-8 text-center text-zinc-600 text-sm">{t('fin_no_match')}</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
