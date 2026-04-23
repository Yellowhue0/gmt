'use client'

import { useEffect, useState } from 'react'
import { MapPin, Calendar, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

type Event = {
  id: string
  title: string
  description: string | null
  date: string
  location: string | null
  type: string
  createdAt: string
}

type User = { role: string } | null

const TYPE_COLORS: Record<string, string> = {
  COMPETITION: 'bg-brand/20 text-brand border border-brand/30',
  FIGHT: 'bg-red-900/30 text-red-400 border border-red-900/30',
  SEMINAR: 'bg-blue-900/30 text-blue-400 border border-blue-900/30',
  OTHER: 'bg-zinc-700 text-zinc-300',
}

const EVENT_TYPE_KEYS: Record<string, TranslationKey> = {
  COMPETITION: 'etype_competition',
  FIGHT: 'etype_fight',
  SEMINAR: 'etype_seminar',
  OTHER: 'etype_other',
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', type: 'COMPETITION' })
  const [submitting, setSubmitting] = useState(false)
  const { lang, t } = useLanguage()

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
    ]).then(([u, e]) => {
      setUser(u.data)
      setEvents(e.data ?? [])
      setLoading(false)
    })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { data } = await res.json()
      setEvents(prev => [...prev, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setForm({ title: '', description: '', date: '', location: '', type: 'COMPETITION' })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('ev_delete_confirm'))) return
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== id))
  }

  const isAdmin = user?.role === 'ADMIN'
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t('ev_title')}
          </h1>
          <p className="text-zinc-500">{t('ev_sub')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
          >
            <Plus size={16} />
            {t('ev_add')}
          </button>
        )}
      </div>

      {/* Create form (admin only) */}
      {showForm && isAdmin && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-white font-semibold mb-4">{t('ev_new')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_title')}</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand"
                placeholder="SM i Muay Thai 2025"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_date')}</label>
              <input
                required
                type="datetime-local"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_location')}</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand"
                placeholder="Stockholm, Eriksdalsbadet"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_type')}</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand"
              >
                {(['COMPETITION', 'FIGHT', 'SEMINAR', 'OTHER'] as const).map(tp => (
                  <option key={tp} value={tp}>{t(EVENT_TYPE_KEYS[tp])}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_desc')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="px-6 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-60">
              {submitting ? t('ev_saving') : t('ev_save')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded transition-colors">
              {t('ev_cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-zinc-600 text-center py-16">{t('ev_loading')}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <Calendar size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500">{t('ev_empty')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(ev => {
            const d = new Date(ev.date)
            const isClose = (d.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
            return (
              <div
                key={ev.id}
                className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all hover:border-zinc-700 ${
                  isClose ? 'border-brand/30' : 'border-zinc-800'
                }`}
              >
                <div className="bg-gradient-to-r from-brand/20 to-transparent px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-brand text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                      {d.getDate()}
                    </div>
                    <div className="text-zinc-400 text-xs uppercase tracking-wide">
                      {d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[ev.type] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {t(EVENT_TYPE_KEYS[ev.type] ?? 'etype_other')}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="text-white font-semibold text-lg mb-2">{ev.title}</h3>
                  {ev.description && (
                    <p className="text-zinc-500 text-sm mb-3 leading-relaxed">{ev.description}</p>
                  )}
                  {ev.location && (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
                      <MapPin size={13} />
                      {ev.location}
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="mt-4 flex items-center gap-1.5 text-zinc-600 hover:text-red-400 text-xs transition-colors"
                    >
                      <Trash2 size={12} />
                      {t('ev_delete')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
