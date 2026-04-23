'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type Member = {
  id: string
  name: string
  email: string
  role: string
  swishNumber: string | null
  phone: string | null
  membershipPaid: boolean
  membershipExpiry: string | null
  createdAt: string
  _count: { checkIns: number }
}

export default function AdminDashboardPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    fetch('/api/admin/members')
      .then(r => r.json())
      .then(d => { setMembers(d.data ?? []); setLoading(false) })
  }, [])

  const toggleMembership = async (member: Member) => {
    setUpdating(member.id)
    const res = await fetch(`/api/admin/members/${member.id}`, {
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

  const changeRole = async (member: Member, role: string) => {
    const res = await fetch(`/api/admin/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m))
    }
  }

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'paid' && m.membershipPaid) ||
      (filter === 'unpaid' && !m.membershipPaid)
    return matchSearch && matchFilter
  })

  const paid = members.filter(m => m.membershipPaid).length
  const unpaid = members.filter(m => !m.membershipPaid).length

  const stats = [
    { label: t('adm_stat_total'), value: members.length, color: 'text-white' },
    { label: t('adm_stat_paid'), value: paid, color: 'text-green-400' },
    { label: t('adm_stat_unpaid'), value: unpaid, color: 'text-yellow-400' },
    { label: t('adm_stat_checkins'), value: members.reduce((s, m) => s + m._count.checkIns, 0), color: 'text-brand' },
  ]

  const filters = [
    { key: 'all' as const, label: t('adm_filter_all') },
    { key: 'paid' as const, label: t('adm_filter_paid') },
    { key: 'unpaid' as const, label: t('adm_filter_unpaid') },
  ]

  const columns = [
    t('adm_col_name'), t('adm_col_email'), t('adm_col_swish'),
    t('adm_col_role'), t('adm_col_checkins'), t('adm_col_status'),
    t('adm_col_expires'), t('adm_col_action'),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {t('adm_title')}
        </h1>
        <p className="text-zinc-500">{t('adm_sub')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${color}`} style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </div>
            <div className="text-zinc-600 text-xs uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('adm_search')}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-2">
          {filters.map(f => (
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

      {/* Member table */}
      {loading ? (
        <div className="text-zinc-600 text-center py-16">{t('adm_loading')}</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {columns.map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                      {h}
                    </th>
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
                      <td className="px-4 py-3">
                        <select
                          value={member.role}
                          onChange={e => changeRole(member, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand"
                        >
                          <option value="MEMBER">{t('adm_role_member')}</option>
                          <option value="TRAINER">{t('adm_role_trainer')}</option>
                          <option value="ADMIN">{t('adm_role_admin')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-center">{member._count.checkIns}</td>
                      <td className="px-4 py-3">
                        {member.membershipPaid ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle2 size={12} /> {t('adm_paid')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-500 text-xs">
                            <XCircle size={12} /> {t('adm_unpaid_status')}
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
                          onClick={() => toggleMembership(member)}
                          disabled={updating === member.id}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                            member.membershipPaid
                              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                              : 'bg-brand hover:bg-brand-hover text-white'
                          }`}
                        >
                          {updating === member.id ? '...' : member.membershipPaid ? t('adm_revoke') : t('adm_confirm')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-sm">
                {t('adm_no_match')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
