'use client'

import { useEffect, useState } from 'react'
import { Camera, CheckCircle2, AlertCircle, User } from 'lucide-react'
import RoleBadge from '@/components/RoleBadge'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'

const MAX_BIO = 200
const MAX_NAME_CHANGES = 2

type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  bio: string | null
  avatarUrl: string | null
  usernameChangesCount: number
  membershipPaid: boolean
  membershipExpiry: string | null
  swishNumber: string | null
  phone: string | null
  createdAt: string
}

type Toast = { type: 'success' | 'error'; message: string }

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const u = d.data as UserProfile | null
        if (u) {
          setProfile(u)
          setName(u.name)
          setBio(u.bio ?? '')
        }
        setLoading(false)
      })
  }, [])

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const saveBio = async () => {
    if (!profile || bio === (profile.bio ?? '')) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, bio: data.data.bio } : prev)
      showToast('success', t('prof_bio_saved'))
    } else {
      showToast('error', data.error ?? t('prof_error'))
    }
    setSaving(false)
  }

  const saveName = async () => {
    if (!profile || name === profile.name) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, name: data.data.name, usernameChangesCount: data.data.usernameChangesCount } : prev)
      showToast('success', t('prof_name_saved'))
    } else {
      showToast('error', data.error ?? t('prof_error'))
    }
    setSaving(false)
  }

  if (loading) return <div className="text-zinc-600 text-center py-20">{t('adm_loading')}</div>
  if (!profile) return null

  const changesLeft = MAX_NAME_CHANGES - profile.usernameChangesCount
  const nameReadOnly = changesLeft <= 0
  const expiry = profile.membershipExpiry ? new Date(profile.membershipExpiry) : null

  const ROLE_LABEL: Record<string, string> = {
    ADMIN: t('adm_role_admin'),
    TRAINER: t('adm_role_trainer'),
    FIGHTER: t('adm_role_fighter'),
    FINANCE: t('adm_role_finance'),
    MEMBER: t('adm_role_member'),
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-300 border border-green-700' : 'bg-red-900/90 text-red-300 border border-red-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {t('prof_title')}
        </h1>
        <p className="text-zinc-500">{t('prof_sub')}</p>
      </div>

      {/* Profile picture */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-5">{t('prof_picture')}</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-zinc-600" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-zinc-700 rounded-full border-2 border-zinc-900 flex items-center justify-center">
              <Camera size={12} className="text-zinc-400" />
            </div>
          </div>
          <div>
            <button
              disabled
              className="px-4 py-2 bg-zinc-800 text-zinc-500 text-sm rounded-lg border border-zinc-700 cursor-not-allowed opacity-60 mb-1"
            >
              {t('prof_upload')}
            </button>
            <p className="text-zinc-700 text-xs">{t('prof_coming_soon')}</p>
          </div>
        </div>
      </div>

      {/* Role & account info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">{t('prof_account')}</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('dash_email')}</span>
            <span className="text-zinc-300">{profile.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('dash_role')}</span>
            <div className="flex items-center gap-2">
              <RoleBadge role={profile.role} size="md" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('prof_membership')}</span>
            <span className={profile.membershipPaid ? 'text-green-400' : 'text-yellow-500'}>
              {profile.membershipPaid
                ? `${t('adm_paid')}${expiry ? ` · ${formatDate(expiry)}` : ''}`
                : t('adm_unpaid_status')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">{t('prof_member_since')}</span>
            <span className="text-zinc-400">{formatDate(new Date(profile.createdAt))}</span>
          </div>
        </div>
      </div>

      {/* Username */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('prof_username')}</h2>
        <p className="text-zinc-600 text-xs mb-4">
          {nameReadOnly ? t('prof_name_used_up') : t('prof_name_remaining').replace('{n}', String(changesLeft))}
        </p>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            readOnly={nameReadOnly}
            className={`flex-1 bg-zinc-800 border text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors ${
              nameReadOnly
                ? 'border-zinc-700 text-zinc-600 cursor-not-allowed'
                : 'border-zinc-700 text-white focus:border-brand'
            }`}
          />
          {!nameReadOnly && (
            <button
              onClick={saveName}
              disabled={saving || name === profile.name || !name.trim()}
              className="px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t('prof_save')}
            </button>
          )}
        </div>
        {!nameReadOnly && (
          <div className="mt-2 flex gap-1">
            {Array.from({ length: MAX_NAME_CHANGES }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${i < profile.usernameChangesCount ? 'bg-zinc-600' : 'bg-brand'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('prof_bio_label')}</h2>
        <p className="text-zinc-600 text-xs mb-4">{t('prof_bio_hint')}</p>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, MAX_BIO))}
          rows={4}
          placeholder={t('prof_bio_placeholder')}
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand resize-none placeholder:text-zinc-600 mb-2"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${bio.length >= MAX_BIO ? 'text-red-400' : 'text-zinc-600'}`}>
            {bio.length} / {MAX_BIO}
          </span>
          <button
            onClick={saveBio}
            disabled={saving || bio === (profile.bio ?? '')}
            className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t('prof_save')}
          </button>
        </div>
      </div>
    </div>
  )
}
