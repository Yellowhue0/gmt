'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Pin, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { formatRelative, getCategoryLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import MentionTextarea from '@/components/MentionTextarea'
import type { TranslationKey } from '@/lib/i18n'

type Author = { id: string; name: string; role: string }
type Comment = { id: string; content: string; author: Author; createdAt: string }
type Post = {
  id: string
  content: string
  category: string
  pinned: boolean
  author: Author
  createdAt: string
  _count: { comments: number }
}
type User = { userId?: string; id?: string; name: string; role: string } | null

const CAT_COLORS: Record<string, string> = {
  ANNOUNCEMENT: 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/30',
  SPARRING: 'bg-brand/20 text-brand border border-brand/30',
  GENERAL: 'bg-zinc-700 text-zinc-300',
  QUESTION: 'bg-blue-900/30 text-blue-400 border border-blue-900/30',
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-brand/20 text-brand text-[10px] px-1.5 py-0.5 rounded uppercase font-bold',
  TRAINER: 'bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold',
}

const CAT_LABEL_KEYS: Record<string, TranslationKey> = {
  '': 'com_cat_all',
  ANNOUNCEMENT: 'com_cat_announcements',
  SPARRING: 'com_cat_sparring',
  GENERAL: 'com_cat_general',
  QUESTION: 'com_cat_questions',
}

function renderMentions(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="text-brand font-medium">{part}</span>
      : <span key={i}>{part}</span>
  )
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [user, setUser] = useState<User>(null)
  const [category, setCategory] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newMentions, setNewMentions] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('GENERAL')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { t } = useLanguage()

  const CATEGORIES = [
    { value: '', key: 'com_cat_all' as TranslationKey },
    { value: 'ANNOUNCEMENT', key: 'com_cat_announcements' as TranslationKey },
    { value: 'SPARRING', key: 'com_cat_sparring' as TranslationKey },
    { value: 'GENERAL', key: 'com_cat_general' as TranslationKey },
    { value: 'QUESTION', key: 'com_cat_questions' as TranslationKey },
  ]

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.data))
    loadPosts()
  }, [])

  useEffect(() => { loadPosts() }, [category])

  const loadPosts = () => {
    setLoading(true)
    const qs = category ? `?category=${category}` : ''
    fetch(`/api/posts${qs}`)
      .then(r => r.json())
      .then(d => { setPosts(d.data ?? []); setLoading(false) })
  }

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return
    setPosting(true)
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, category: newCategory, mentionedUserIds: newMentions }),
    })
    if (res.ok) {
      setNewContent('')
      setNewMentions([])
      setShowForm(false)
      loadPosts()
    }
    setPosting(false)
  }

  const userId = (user as Record<string, string> | null)?.id ?? (user as Record<string, string> | null)?.userId
  const sparringPosts = posts.filter(p => p.category === 'SPARRING' && p.pinned)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t('com_title')}
          </h1>
          <p className="text-zinc-500">{t('com_sub')}</p>
        </div>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
          >
            <Send size={14} />
            {t('com_new_post')}
          </button>
        )}
      </div>

      {/* Sunday sparring highlight */}
      {sparringPosts.length > 0 && (
        <div className="bg-brand/10 border border-brand/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-brand font-semibold text-sm mb-2">
            <Pin size={14} />
            {t('com_sparring_banner')}
          </div>
          {sparringPosts.slice(0, 1).map(p => (
            <div key={p.id}>
              <p className="text-white text-sm whitespace-pre-wrap">{renderMentions(p.content)}</p>
              <div className="text-zinc-600 text-xs mt-2">{p.author.name} · {formatRelative(p.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {/* New post form */}
      {showForm && user && (
        <form onSubmit={submitPost} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">{t('com_post_label')}</span>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand"
            >
              {CATEGORIES.filter(c => c.value).map(c => (
                <option key={c.value} value={c.value}>{t(c.key)}</option>
              ))}
            </select>
          </div>
          <MentionTextarea
            value={newContent}
            onChange={setNewContent}
            onMentionsChange={setNewMentions}
            rows={4}
            placeholder={t('com_placeholder')}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand resize-none placeholder:text-zinc-600"
          />
          <p className="text-zinc-700 text-xs">{t('com_mention_hint')}</p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={posting || !newContent.trim()}
              className="px-5 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              {posting ? t('com_publishing') : t('com_publish')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
            >
              {t('com_cancel')}
            </button>
          </div>
        </form>
      )}

      {!user && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-center text-zinc-500 text-sm">
          <a href="/login" className="text-brand hover:underline">{t('com_login_cta')}</a> {t('com_login_suffix')}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === c.value
                ? 'bg-brand text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
            }`}
          >
            {t(c.key)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-zinc-600 text-center py-16">{t('com_loading')}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">{t('com_empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              userId={userId}
              onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PostCard({ post, user, userId, onDelete }: {
  post: Post
  user: User
  userId: string | undefined
  onDelete: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentMentions, setCommentMentions] = useState<string[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { t } = useLanguage()

  const loadComments = async () => {
    if (loadingComments) return
    setLoadingComments(true)
    const res = await fetch(`/api/posts/${post.id}/comments`)
    const data = await res.json()
    setComments(data.data ?? [])
    setLoadingComments(false)
  }

  const toggleComments = () => {
    if (!showComments && comments.length === 0) loadComments()
    setShowComments(!showComments)
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment, mentionedUserIds: commentMentions }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setComments(prev => [...prev, data])
      setNewComment('')
      setCommentMentions([])
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!confirm(t('com_delete_confirm'))) return
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    if (res.ok) onDelete()
  }

  const canDelete = user && (userId === post.author.id || user.role === 'ADMIN')
  const roleBadgeLabel = (role: string) => role === 'ADMIN' ? t('adm_role_admin') : t('adm_role_trainer')

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden ${post.pinned ? 'border-brand/30' : 'border-zinc-800'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-white">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{post.author.name}</span>
                {ROLE_BADGE[post.author.role] && (
                  <span className={ROLE_BADGE[post.author.role]}>{roleBadgeLabel(post.author.role)}</span>
                )}
              </div>
              <span className="text-zinc-600 text-xs">{formatRelative(post.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.pinned && <Pin size={12} className="text-brand" />}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[post.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
              {t(CAT_LABEL_KEYS[post.category] ?? 'com_cat_general')}
            </span>
          </div>
        </div>

        <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap mb-4">
          {renderMentions(post.content)}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            <MessageCircle size={14} />
            {post._count.comments} {t('com_replies')}
            {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {canDelete && (
            <button onClick={handleDelete} className="text-zinc-700 hover:text-red-400 text-xs transition-colors">
              {t('com_delete')}
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <div className="border-t border-zinc-800 bg-zinc-950/50">
          {loadingComments ? (
            <p className="text-zinc-600 text-xs p-4">{t('com_loading_comments')}</p>
          ) : (
            <div className="space-y-3 p-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                    {c.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-zinc-300 text-xs font-medium">{c.author.name}</span>
                      {ROLE_BADGE[c.author.role] && (
                        <span className={ROLE_BADGE[c.author.role]}>{roleBadgeLabel(c.author.role)}</span>
                      )}
                      <span className="text-zinc-600 text-xs">{formatRelative(c.createdAt)}</span>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      {renderMentions(c.content)}
                    </p>
                  </div>
                </div>
              ))}
              {user && (
                <div className="mt-3">
                  <form onSubmit={submitComment} className="flex gap-2">
                    <MentionTextarea
                      value={newComment}
                      onChange={setNewComment}
                      onMentionsChange={setCommentMentions}
                      rows={1}
                      placeholder={t('com_comment_placeholder')}
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-brand placeholder:text-zinc-600 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="px-3 py-1.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-xs rounded transition-colors"
                    >
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
