'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Search, Trash2, Users, ShieldCheck, Sword, Wallet, AlertTriangle, Clock, Shield } from 'lucide-react'
import { formatDate, formatRelative } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

type AuditEntry = {
  id: string
  action: string
  performedByName: string
  targetUserName: string | null
  details: string | null
  createdAt: string
}

const ACTION_STYLES: Record<string, string> = {
  LOGIN:               'bg-zinc-800 text-zinc-300 border-zinc-700',
  ACCOUNT_CREATED:     'bg-green-900/40 text-green-400 border-green-800/50',
  PASSWORD_RESET:      'bg-red-900/40 text-red-400 border-red-800/50',
  ROLE_CHANGED:        'bg-blue-900/40 text-blue-400 border-blue-800/50',
  MEMBERSHIP_UPDATED:  'bg-purple-900/40 text-purple-400 border-purple-800/50',
  PAYMENT_MARKED:      'bg-brand/20 text-brand border-brand/30',
  PROFILE_UPDATED:     'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
}

type Member = {
  id: string
  name: string
  email: string
  role: string
  swishNumber: string | null
  phone: string | null
  membershipPaid: boolean
  membershipStart: string | null
  membershipEnd: string | null
  createdAt: string
  _count: { checkIns: number }
}

type DateField = { id: string; field: 'start' | 'end'; value: string }

const ALL_ROLES = ['MEMBER', 'TRAINER', 'FIGHTER', 'FINANCE', 'ADMIN'] as const

const ROLE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  MEMBER:  { icon: <Users size={14} />,       color: 'text-zinc-400'   },
  TRAINER: { icon: <ShieldCheck size={14} />, color: 'text-blue-400'   },
  FIGHTER: { icon: <Sword size={14} />,       color: 'text-brand'      },
  FINANCE: { icon: <Wallet size={14} />,      color: 'text-yellow-400' },
  ADMIN:   { icon: <ShieldCheck size={14} />, color: 'text-purple-400' },
}

function toDateInput(d: string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

function getMembershipStatus(end: string | null): { type: 'expired' | 'active' | 'none'; daysLeft: number } {
  if (!end) return { type: 'none', daysLeft: 0 }
  const daysLeft = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)
  return { type: daysLeft < 0 ? 'expired' : 'active', daysLeft }
}

export default function AdminDashboardPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [payFilter, setPayFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dateEdit, setDateEdit] = useState<DateField | null>(null)
  const [savingDate, setSavingDate] = useState(false)
  const [timeline, setTimeline] = useState<Record<string, AuditEntry[]>>({})
  const [timelineOpen, setTimelineOpen] = useState<string | null>(null)
  const [timelineLoading, setTimelineLoading] = useState<string | null>(null)
  const { t } = useLanguage()

  const getActionLabel = (a: string): string => {
    const key = `action_${a}` as TranslationKey
    return t(key) !== key ? t(key) : a
  }

  const toggleTimeline = async (id: string) => {
    if (timelineOpen === id) { setTimelineOpen(null); return }
    setTimelineOpen(id)
    if (timeline[id]) return
    setTimelineLoading(id)
    const res = await fetch(`/api/admin/audit-log?userId=${id}&page=1`)
    if (res.ok) {
      const { data } = await res.json()
      setTimeline(prev => ({ ...prev, [id]: data }))
    }
    setTimelineLoading(null)
  }

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
    if (res.ok) setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m))
  }

  const deleteMember = async (member: Member) => {
    if (!confirm(`Remove ${member.name}? This cannot be undone.`)) return
    setDeleting(member.id)
    const res = await fetch(`/api/admin/members/${member.id}`, { method: 'DELETE' })
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== member.id))
    setDeleting(null)
  }

  const startDateEdit = (id: string, field: 'start' | 'end', current: string | null) => {
    if (savingDate) return
    setDateEdit({ id, field, value: toDateInput(current) })
  }

  const saveDateEdit = async () => {
    if (!dateEdit) return
    setSavingDate(true)
    const key = dateEdit.field === 'start' ? 'membershipStart' : 'membershipEnd'
    const res = await fetch(`/api/admin/members/${dateEdit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: dateEdit.value || null }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setMembers(prev => prev.map(m => m.id === dateEdit.id ? { ...m, ...data } : m))
    }
    setDateEdit(null)
    setSavingDate(false)
  }

  const cancelDateEdit = () => setDateEdit(null)

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchPay =
      payFilter === 'all' ||
      (payFilter === 'paid' && m.membershipPaid) ||
      (payFilter === 'unpaid' && !m.membershipPaid)
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    return matchSearch && matchPay && matchRole
  })

  const paid = members.filter(m => m.membershipPaid).length
  const unpaid = members.filter(m => !m.membershipPaid).length
  const totalCheckIns = members.reduce((s, m) => s + m._count.checkIns, 0)
  const expired = members.filter(m => getMembershipStatus(m.membershipEnd).type === 'expired').length

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      MEMBER: t('adm_role_member'), TRAINER: t('adm_role_trainer'),
      FIGHTER: t('adm_role_fighter'), FINANCE: t('adm_role_finance'), ADMIN: t('adm_role_admin'),
    }
    return map[role] ?? role
  }

  const primaryStats = [
    { label: t('adm_stat_total'), value: members.length, color: 'text-white' },
    { label: t('adm_stat_paid'), value: paid, color: 'text-green-400' },
    { label: t('adm_stat_unpaid'), value: unpaid, color: 'text-yellow-400' },
    { label: t('mem_expired'), value: expired, color: 'text-red-400' },
    { label: t('adm_stat_checkins'), value: totalCheckIns, color: 'text-brand' },
  ]

  const roleStats = ALL_ROLES.map(role => ({
    role, label: getRoleLabel(role),
    count: members.filter(m => m.role === role).length,
    meta: ROLE_META[role],
  }))

  const payFilters = [
    { key: 'all' as const, label: t('adm_filter_all') },
    { key: 'paid' as const, label: t('adm_filter_paid') },
    { key: 'unpaid' as const, label: t('adm_filter_unpaid') },
  ]

  const columns = [
    t('adm_col_name'), t('adm_col_email'), t('adm_col_swish'),
    t('adm_col_role'), t('adm_col_checkins'), t('adm_col_status'),
    t('adm_col_start'), t('adm_col_expires'), t('adm_col_action'),
    t('audit_history'),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t('adm_title')}
          </h1>
          <p className="text-zinc-500">{t('adm_sub')}</p>
        </div>
        <Link
          href="/dashboard/admin/audit-log"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
        >
          <Shield size={14} />
          {t('audit_link')}
        </Link>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
        {primaryStats.map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${color}`} style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </div>
            <div className="text-zinc-600 text-xs uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {roleStats.map(({ role, label, count, meta }) => (
          <button
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            className={`bg-zinc-900 border rounded-xl p-3 text-center transition-colors ${
              roleFilter === role ? 'border-brand' : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className={`flex items-center justify-center gap-1 mb-1 ${meta.color}`}>
              {meta.icon}
              <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{count}</span>
            </div>
            <div className="text-zinc-600 text-xs uppercase tracking-wider truncate">{label}</div>
          </button>
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
        <div className="flex gap-2 flex-wrap">
          {payFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setPayFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                payFilter === f.key ? 'bg-brand text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
          {roleFilter !== 'all' && (
            <button
              onClick={() => setRoleFilter('all')}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:text-white transition-colors"
            >
              {getRoleLabel(roleFilter)} ×
            </button>
          )}
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
                    <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => {
                  const status = getMembershipStatus(member.membershipEnd)
                  const isExpiringSoon = status.type === 'active' && status.daysLeft <= 14
                  const meta = ROLE_META[member.role] ?? ROLE_META.MEMBER
                  const editingStart = dateEdit?.id === member.id && dateEdit.field === 'start'
                  const editingEnd = dateEdit?.id === member.id && dateEdit.field === 'end'

                  return (
                    <>
                    <tr key={member.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium whitespace-nowrap">{member.name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-zinc-400 text-xs">{member.email}</td>

                      {/* Swish */}
                      <td className="px-4 py-3 text-zinc-400 text-xs">{member.swishNumber ?? '–'}</td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <select
                          value={member.role}
                          onChange={e => changeRole(member, e.target.value)}
                          className={`bg-zinc-800 border border-zinc-700 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand ${meta.color}`}
                        >
                          <option value="MEMBER">{t('adm_role_member')}</option>
                          <option value="TRAINER">{t('adm_role_trainer')}</option>
                          <option value="FIGHTER">{t('adm_role_fighter')}</option>
                          <option value="FINANCE">{t('adm_role_finance')}</option>
                          <option value="ADMIN">{t('adm_role_admin')}</option>
                        </select>
                      </td>

                      {/* Check-ins */}
                      <td className="px-4 py-3 text-zinc-400 text-center">{member._count.checkIns}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {member.membershipPaid ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs whitespace-nowrap">
                            <CheckCircle2 size={12} /> {t('adm_paid')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-500 text-xs whitespace-nowrap">
                            <XCircle size={12} /> {t('adm_unpaid_status')}
                          </span>
                        )}
                      </td>

                      {/* Start date */}
                      <td className="px-4 py-3">
                        {editingStart ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="date"
                              value={dateEdit!.value}
                              onChange={e => setDateEdit(d => d ? { ...d, value: e.target.value } : d)}
                              onKeyDown={e => { if (e.key === 'Enter') saveDateEdit(); if (e.key === 'Escape') cancelDateEdit() }}
                              className="bg-zinc-800 border border-brand text-white text-xs rounded px-2 py-1 focus:outline-none w-32"
                            />
                            <button onClick={saveDateEdit} disabled={savingDate} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                            <button onClick={cancelDateEdit} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startDateEdit(member.id, 'start', member.membershipStart)}
                            className="text-xs text-zinc-400 hover:text-white hover:underline transition-colors text-left"
                          >
                            {member.membershipStart ? formatDate(member.membershipStart) : <span className="text-zinc-700">– kl</span>}
                          </button>
                        )}
                      </td>

                      {/* End date + badge */}
                      <td className="px-4 py-3">
                        {editingEnd ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="date"
                              value={dateEdit!.value}
                              onChange={e => setDateEdit(d => d ? { ...d, value: e.target.value } : d)}
                              onKeyDown={e => { if (e.key === 'Enter') saveDateEdit(); if (e.key === 'Escape') cancelDateEdit() }}
                              className="bg-zinc-800 border border-brand text-white text-xs rounded px-2 py-1 focus:outline-none w-32"
                            />
                            <button onClick={saveDateEdit} disabled={savingDate} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                            <button onClick={cancelDateEdit} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startDateEdit(member.id, 'end', member.membershipEnd)}
                            className="text-left group"
                          >
                            {member.membershipEnd ? (
                              <div>
                                <div className={`text-xs group-hover:underline ${status.type === 'expired' ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                  {formatDate(member.membershipEnd)}
                                </div>
                                <div className="mt-0.5">
                                  {status.type === 'expired' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/30">
                                      <AlertTriangle size={9} /> {t('mem_expired')}
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] ${isExpiringSoon ? 'text-yellow-400' : 'text-zinc-600'}`}>
                                      {t('mem_days_left').replace('{n}', String(status.daysLeft))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-700 text-xs">–</span>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Toggle paid */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleMembership(member)}
                          disabled={updating === member.id}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap ${
                            member.membershipPaid
                              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                              : 'bg-brand hover:bg-brand-hover text-white'
                          }`}
                        >
                          {updating === member.id ? '...' : member.membershipPaid ? t('adm_revoke') : t('adm_confirm')}
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteMember(member)}
                          disabled={deleting === member.id}
                          className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                          title={t('adm_delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>

                      {/* History toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleTimeline(member.id)}
                          className={`p-1.5 rounded transition-colors ${
                            timelineOpen === member.id
                              ? 'text-brand bg-brand/10'
                              : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                          title={t('audit_history')}
                        >
                          <Clock size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Timeline panel */}
                    {timelineOpen === member.id && (
                      <tr key={`${member.id}-tl`}>
                        <td colSpan={11} className="px-4 pb-4 bg-zinc-950/50">
                          <div className="border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
                              <Clock size={12} className="text-zinc-500" />
                              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                {t('audit_history')} – {member.name}
                              </span>
                            </div>
                            {timelineLoading === member.id ? (
                              <p className="px-3 py-4 text-center text-zinc-600 text-xs">{t('audit_loading')}</p>
                            ) : (timeline[member.id]?.length ?? 0) === 0 ? (
                              <p className="px-3 py-4 text-center text-zinc-600 text-xs">{t('audit_no_history')}</p>
                            ) : (
                              <ul className="divide-y divide-zinc-800/50 max-h-64 overflow-y-auto">
                                {timeline[member.id].map(entry => (
                                  <li key={entry.id} className="flex items-start gap-3 px-3 py-2.5">
                                    <span className={`shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${ACTION_STYLES[entry.action] ?? ACTION_STYLES.LOGIN}`}>
                                      {getActionLabel(entry.action)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      {entry.details && (
                                        <p className="text-zinc-400 text-xs truncate">{entry.details}</p>
                                      )}
                                      <p className="text-zinc-600 text-[10px]">
                                        {t('audit_col_by')}: {entry.performedByName}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-zinc-700 text-[10px] whitespace-nowrap">
                                      {formatRelative(entry.createdAt)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-sm">{t('adm_no_match')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
