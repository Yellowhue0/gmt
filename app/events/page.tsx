'use client'

import { useEffect, useState } from 'react'
import { MapPin, Calendar, Plus, Trash2, Pencil, Users, Check, X, MessageCircle, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'
import { formatRelative } from '@/lib/utils'

type EventItem = {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  location: string | null
  hostName: string | null
  type: string
  createdAt: string
  _count: { attendees: number }
  attendees: { userId: string }[]
}

type CommentAuthor = { id: string; name: string; fullName: string | null; avatarUrl: string | null }
type EventComment = {
  id: string
  content: string
  createdAt: string
  author: CommentAuthor
  replies: Array<{ id: string; content: string; createdAt: string; author: CommentAuthor }>
}

type CurrentUser = { id: string; role: string; name: string } | null

const TYPE_COLORS: Record<string, string> = {
  COMPETITION: 'bg-brand/20 text-brand border border-brand/30',
  EVENT: 'bg-purple-900/30 text-purple-400 border border-purple-800/30',
  FIGHT: 'bg-red-900/30 text-red-400 border border-red-900/30',
  SEMINAR: 'bg-blue-900/30 text-blue-400 border border-blue-900/30',
  OTHER: 'bg-zinc-700 text-zinc-300',
}

const EVENT_TYPE_KEYS: Record<string, TranslationKey> = {
  COMPETITION: 'etype_competition',
  EVENT: 'etype_event',
  FIGHT: 'etype_fight',
  SEMINAR: 'etype_seminar',
  OTHER: 'etype_other',
}

const EMPTY_FORM = { title: '', description: '', date: '', time: '', location: '', hostName: '', type: 'COMPETITION' }

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [attendingLoading, setAttendingLoading] = useState<string | null>(null)

  // Comments
  const [commentsByEvent, setCommentsByEvent] = useState<Record<string, EventComment[]>>({})
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [postingComment, setPostingComment] = useState(false)

  const { lang, t } = useLanguage()

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
    ]).then(([u, e]) => {
      setUser(u.data ?? null)
      setEvents(e.data ?? [])
      setLoading(false)
    })
  }, [])

  const loadComments = async (eventId: string) => {
    if (commentsByEvent[eventId]) return
    const res = await fetch(`/api/events/${eventId}/comments`)
    if (res.ok) {
      const { data } = await res.json()
      setCommentsByEvent(prev => ({ ...prev, [eventId]: data }))
    }
  }

  const toggleComments = async (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null)
    } else {
      setExpandedEvent(eventId)
      await loadComments(eventId)
    }
  }

  const postComment = async (eventId: string, parentId?: string) => {
    const text = parentId ? replyText[parentId] : commentText[eventId]
    if (!text?.trim() || !user) return
    setPostingComment(true)
    const res = await fetch(`/api/events/${eventId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim(), parentId: parentId ?? null }),
    })
    if (res.ok) {
      const { data } = await res.json()
      if (parentId) {
        setCommentsByEvent(prev => ({
          ...prev,
          [eventId]: prev[eventId].map(c =>
            c.id === parentId ? { ...c, replies: [...c.replies, data] } : c
          ),
        }))
        setReplyText(prev => ({ ...prev, [parentId]: '' }))
        setReplyingTo(null)
      } else {
        setCommentsByEvent(prev => ({
          ...prev,
          [eventId]: [...(prev[eventId] ?? []), { ...data, replies: [] }],
        }))
        setCommentText(prev => ({ ...prev, [eventId]: '' }))
      }
    }
    setPostingComment(false)
  }

  const deleteComment = async (eventId: string, commentId: string, parentId?: string) => {
    const res = await fetch(`/api/events/${eventId}/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      setCommentsByEvent(prev => {
        const list = prev[eventId] ?? []
        if (parentId) {
          return {
            ...prev,
            [eventId]: list.map(c =>
              c.id === parentId ? { ...c, replies: c.replies.filter(r => r.id !== commentId) } : c
            ),
          }
        }
        return { ...prev, [eventId]: list.filter(c => c.id !== commentId) }
      })
    }
  }

  const canManage = user?.role === 'ADMIN' || user?.role === 'TRAINER'
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB'

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (ev: EventItem) => {
    setEditingId(ev.id)
    const d = new Date(ev.date)
    const dateStr = d.toISOString().split('T')[0]
    setForm({
      title: ev.title,
      description: ev.description ?? '',
      date: dateStr,
      time: ev.time ?? '',
      location: ev.location ?? '',
      hostName: ev.hostName ?? '',
      type: ev.type,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const datetime = form.time ? `${form.date}T${form.time}` : `${form.date}T00:00`
    const payload = { ...form, date: datetime }

    if (editingId) {
      const res = await fetch(`/api/events/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const { data } = await res.json()
        setEvents(prev => prev.map(ev => ev.id === editingId ? { ...ev, ...data } : ev))
        closeForm()
      }
    } else {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const { data } = await res.json()
        setEvents(prev => [...prev, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
        closeForm()
      }
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('ev_delete_confirm'))) return
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== id))
  }

  const handleAttend = async (id: string) => {
    if (!user) return
    setAttendingLoading(id)
    const res = await fetch(`/api/events/${id}/attend`, { method: 'POST' })
    if (res.ok) {
      const { data } = await res.json()
      setEvents(prev => prev.map(ev => {
        if (ev.id !== id) return ev
        const wasAttending = ev.attendees.length > 0
        return {
          ...ev,
          attendees: data.attending ? [{ userId: 'me' }] : [],
          _count: { attendees: ev._count.attendees + (data.attending ? 1 : wasAttending ? -1 : 0) },
        }
      }))
    }
    setAttendingLoading(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t('ev_title')}
          </h1>
          <p className="text-zinc-500">{t('ev_sub')}</p>
        </div>
        {canManage && (
          <button
            onClick={showForm && !editingId ? closeForm : openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
          >
            {showForm && !editingId ? <X size={16} /> : <Plus size={16} />}
            {showForm && !editingId ? t('ev_cancel') : t('ev_add')}
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-white font-semibold mb-4">
            {editingId ? t('ev_edit_title') : t('ev_new')}
          </h2>
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
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_host')}</label>
              <input
                value={form.hostName}
                onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand"
                placeholder="GLOMMENS MUAY THAI"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_date')}</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">{t('ev_label_time')}</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
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
                <option value="COMPETITION">{t('etype_competition')}</option>
                <option value="EVENT">{t('etype_event')}</option>
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
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-60"
            >
              {submitting ? t('ev_saving') : editingId ? t('ev_update') : t('ev_save')}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded transition-colors"
            >
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
            const isAttending = ev.attendees?.length > 0
            const attendeeCount = ev._count?.attendees ?? 0

            return (
              <div
                key={ev.id}
                className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all hover:border-zinc-700 ${
                  isClose ? 'border-brand/30' : 'border-zinc-800'
                }`}
              >
                {/* Header */}
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

                {/* Body */}
                <div className="p-5">
                  <h3 className="text-white font-semibold text-lg mb-1">{ev.title}</h3>

                  {/* Meta */}
                  <div className="space-y-1 mb-3">
                    {ev.time && (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
                        <Calendar size={13} />
                        {ev.time}
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
                        <MapPin size={13} />
                        {ev.location}
                      </div>
                    )}
                    {ev.hostName && (
                      <div className="text-zinc-500 text-sm">
                        {ev.hostName}
                      </div>
                    )}
                  </div>

                  {ev.description && (
                    <p className="text-zinc-500 text-sm mb-3 leading-relaxed">{ev.description}</p>
                  )}

                  {/* Attendance + comments row */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <Users size={12} />
                        {attendeeCount} {t('ev_attendees')}
                      </div>
                      <button
                        onClick={() => toggleComments(ev.id)}
                        className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                      >
                        <MessageCircle size={12} />
                        {t('ev_comments')}
                        {expandedEvent === ev.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>

                    {user ? (
                      <button
                        onClick={() => handleAttend(ev.id)}
                        disabled={attendingLoading === ev.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-60 ${
                          isAttending
                            ? 'bg-brand/20 text-brand border border-brand/30 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/30'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-brand/20 hover:text-brand hover:border-brand/30'
                        }`}
                      >
                        {isAttending ? <Check size={11} /> : <Plus size={11} />}
                        {isAttending ? t('ev_attending') : t('ev_not_attending')}
                      </button>
                    ) : null}
                  </div>

                  {/* Comment section */}
                  {expandedEvent === ev.id && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      {/* Comment list */}
                      {!commentsByEvent[ev.id] ? (
                        <p className="text-zinc-600 text-xs py-2">Laddar...</p>
                      ) : commentsByEvent[ev.id].length === 0 ? (
                        <p className="text-zinc-600 text-xs pb-3">{t('ev_no_comments')}</p>
                      ) : (
                        <div className="space-y-3 mb-4">
                          {commentsByEvent[ev.id].map(comment => (
                            <div key={comment.id}>
                              {/* Top-level comment */}
                              <div className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                                  {(comment.author.fullName ?? comment.author.name).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="bg-zinc-800/60 rounded-xl px-3 py-2">
                                    <p className="text-xs font-semibold text-zinc-300 mb-0.5">
                                      {comment.author.fullName ?? comment.author.name}
                                    </p>
                                    <p className="text-xs text-zinc-400 break-words">{comment.content}</p>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 ml-1">
                                    <span className="text-[10px] text-zinc-600">{formatRelative(comment.createdAt)}</span>
                                    {user && (
                                      <button
                                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                        className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                                      >
                                        {t('ev_comment_reply')}
                                      </button>
                                    )}
                                    {user && (user.id === comment.author.id || user.role === 'ADMIN') && (
                                      <button
                                        onClick={() => deleteComment(ev.id, comment.id)}
                                        className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors"
                                      >
                                        {t('ev_comment_delete')}
                                      </button>
                                    )}
                                  </div>

                                  {/* Reply input */}
                                  {replyingTo === comment.id && user && (
                                    <div className="flex gap-2 mt-2">
                                      <input
                                        value={replyText[comment.id] ?? ''}
                                        onChange={e => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(ev.id, comment.id) } }}
                                        placeholder={t('ev_reply_ph')}
                                        className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand"
                                      />
                                      <button
                                        onClick={() => postComment(ev.id, comment.id)}
                                        disabled={postingComment || !replyText[comment.id]?.trim()}
                                        className="p-1.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-lg transition-colors"
                                      >
                                        <Send size={12} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Replies */}
                                  {comment.replies.length > 0 && (
                                    <div className="ml-4 mt-2 space-y-2">
                                      {comment.replies.map(reply => (
                                        <div key={reply.id} className="flex gap-2">
                                          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                            {(reply.author.fullName ?? reply.author.name).charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="bg-zinc-800/40 rounded-xl px-3 py-1.5">
                                              <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">
                                                {reply.author.fullName ?? reply.author.name}
                                              </p>
                                              <p className="text-xs text-zinc-500 break-words">{reply.content}</p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 ml-1">
                                              <span className="text-[10px] text-zinc-700">{formatRelative(reply.createdAt)}</span>
                                              {user && (user.id === reply.author.id || user.role === 'ADMIN') && (
                                                <button
                                                  onClick={() => deleteComment(ev.id, reply.id, comment.id)}
                                                  className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors"
                                                >
                                                  {t('ev_comment_delete')}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New comment input */}
                      {user ? (
                        <div className="flex gap-2">
                          <input
                            value={commentText[ev.id] ?? ''}
                            onChange={e => setCommentText(prev => ({ ...prev, [ev.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(ev.id) } }}
                            placeholder={t('ev_comment_ph')}
                            className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                          />
                          <button
                            onClick={() => postComment(ev.id)}
                            disabled={postingComment || !commentText[ev.id]?.trim()}
                            className="p-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-lg transition-colors"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 text-center py-2">{t('ev_comment_login')}</p>
                      )}
                    </div>
                  )}

                  {/* Admin/Trainer actions */}
                  {canManage && (
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => openEdit(ev)}
                        className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-xs transition-colors"
                      >
                        <Pencil size={11} />
                        {t('ev_edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="flex items-center gap-1.5 text-zinc-600 hover:text-red-400 text-xs transition-colors"
                      >
                        <Trash2 size={11} />
                        {t('ev_delete')}
                      </button>
                    </div>
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
