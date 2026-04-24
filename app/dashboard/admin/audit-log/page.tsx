'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatRelative } from '@/lib/utils'
import type { TranslationKey } from '@/lib/i18n'

type AuditEntry = {
  id: string
  action: string
  performedBy: string
  performedByName: string
  performedByEmail: string
  targetUser: string | null
  targetUserName: string | null
  targetUserEmail: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
}

type Meta = { total: number; page: number; pages: number; pageSize: number }

const ACTION_STYLES: Record<string, { badge: string; dot: string }> = {
  LOGIN:               { badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',          dot: 'bg-zinc-500'   },
  ACCOUNT_CREATED:     { badge: 'bg-green-900/40 text-green-400 border-green-800/50', dot: 'bg-green-500'  },
  ACCOUNT_DELETED:     { badge: 'bg-red-900/50 text-red-300 border-red-700/50',       dot: 'bg-red-400'    },
  PASSWORD_RESET:      { badge: 'bg-red-900/40 text-red-400 border-red-800/50',       dot: 'bg-red-500'    },
  ROLE_CHANGED:        { badge: 'bg-blue-900/40 text-blue-400 border-blue-800/50',    dot: 'bg-blue-500'   },
  MEMBERSHIP_UPDATED:  { badge: 'bg-purple-900/40 text-purple-400 border-purple-800/50', dot: 'bg-purple-500' },
  PAYMENT_MARKED:      { badge: 'bg-brand/20 text-brand border-brand/30',             dot: 'bg-brand'      },
  PROFILE_UPDATED:     { badge: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40', dot: 'bg-yellow-500' },
}

const ALL_ACTIONS = [
  'LOGIN', 'ACCOUNT_CREATED', 'ACCOUNT_DELETED', 'PASSWORD_RESET',
  'ROLE_CHANGED', 'MEMBERSHIP_UPDATED', 'PAYMENT_MARKED', 'PROFILE_UPDATED',
]

export default function AuditLogPage() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, pages: 1, pageSize: 20 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [hoveredTime, setHoveredTime] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (action) params.set('action', action)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const res = await fetch(`/api/admin/audit-log?${params}`)
    if (res.ok) {
      const { data, meta: m } = await res.json()
      setEntries(data)
      setMeta(m)
    }
    setLoading(false)
  }, [page, action, from, to])

  useEffect(() => { load() }, [load])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [action, from, to])

  const getActionLabel = (a: string): string => {
    const key = `action_${a}` as TranslationKey
    return t(key) !== key ? t(key) : a
  }

  const style = (a: string) => ACTION_STYLES[a] ?? ACTION_STYLES.LOGIN

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/admin" className="text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-brand" />
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {t('audit_title')}
          </h1>
        </div>
      </div>
      <p className="text-zinc-500 mb-8 ml-9">{t('audit_sub')}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
        >
          <option value="">{t('audit_filter_all')}</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{getActionLabel(a)}</option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
        />
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
        />

        {(action || from || to) && (
          <button
            onClick={() => { setAction(''); setFrom(''); setTo('') }}
            className="px-3 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
          >
            Rensa filter ×
          </button>
        )}

        <span className="ml-auto self-center text-zinc-600 text-sm">
          {meta.total} händelser totalt
        </span>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {[
                  t('audit_col_time'), t('audit_col_action'),
                  t('audit_col_by'), t('audit_col_user'), t('audit_col_details'),
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-zinc-600">{t('audit_loading')}</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-zinc-600">{t('audit_empty')}</td>
                </tr>
              ) : entries.map(entry => {
                const s = style(entry.action)
                return (
                  <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    {/* Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className="relative group cursor-default"
                        onMouseEnter={() => setHoveredTime(entry.id)}
                        onMouseLeave={() => setHoveredTime(null)}
                      >
                        <span className="text-zinc-400 text-xs">{formatRelative(entry.createdAt)}</span>
                        {hoveredTime === entry.id && (
                          <div className="absolute z-10 bottom-full left-0 mb-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 whitespace-nowrap shadow-xl">
                            {new Date(entry.createdAt).toLocaleString('sv-SE')}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium ${s.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {getActionLabel(entry.action)}
                      </span>
                    </td>

                    {/* Performed by */}
                    <td className="px-4 py-3">
                      <div className="text-white text-xs font-medium">{entry.performedByName}</div>
                      <div className="text-zinc-600 text-[10px]">{entry.performedByEmail}</div>
                    </td>

                    {/* Target user */}
                    <td className="px-4 py-3">
                      {entry.targetUser && entry.targetUser !== entry.performedBy ? (
                        <>
                          <div className="text-zinc-300 text-xs font-medium">{entry.targetUserName}</div>
                          <div className="text-zinc-600 text-[10px]">{entry.targetUserEmail}</div>
                        </>
                      ) : (
                        <span className="text-zinc-700 text-xs">–</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">
                      {entry.details ?? '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('audit_prev')}
          </button>
          <span className="text-zinc-600 text-sm">
            Sida {page} / {meta.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('audit_next')}
          </button>
        </div>
      )}
    </div>
  )
}
