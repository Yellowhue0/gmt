'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { SWISH_NUMBER, MEMBERSHIP_PRICE } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', swishNumber: '' })
  const [registerForChild, setRegisterForChild] = useState(false)
  const [child, setChild] = useState({ firstName: '', lastName: '', dateOfBirth: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const setChildField = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setChild(c => ({ ...c, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, registerForChild, child: registerForChild ? child : undefined }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Något gick fel')
      setLoading(false)
      return
    }

    router.push('/dashboard/pending')
    router.refresh()
  }

  const fields = [
    { label: t('reg_name'), key: 'name', type: 'text', placeholder: 'Förnamn Efternamn', required: true },
    { label: t('reg_email'), key: 'email', type: 'email', placeholder: 'din@epost.se', required: true },
    { label: t('reg_password'), key: 'password', type: 'password', placeholder: '••••••••', required: true },
    { label: t('reg_phone'), key: 'phone', type: 'tel', placeholder: '070-000 00 00', required: false },
    { label: t('reg_swish'), key: 'swishNumber', type: 'tel', placeholder: '070-000 00 00', required: false },
  ]

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/glommenlogo.svg" alt="GMT" width={64} height={64} className="mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white">{t('reg_title')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('reg_sub')}</p>
        </div>

        {/* Swish info */}
        <div className="bg-zinc-900 border border-brand/30 rounded-xl p-4 mb-6">
          <h2 className="text-brand font-semibold text-sm mb-2 uppercase tracking-wide">{t('reg_payment_title')}</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {t('reg_payment_swish')}{' '}
            <strong className="text-white">{MEMBERSHIP_PRICE} kr</strong>{' '}
            {t('reg_payment_to')}{' '}
            <strong className="text-white">{SWISH_NUMBER}</strong>{' '}
            {t('reg_payment_msg')}{' '}
            <strong className="text-white">&quot;{t('reg_payment_name_msg')} – {t('reg_payment_membership')}&quot;</strong>.{' '}
            {t('reg_payment_wait')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {fields.map(({ label, key, type, placeholder, required }) => (
            <div key={key}>
              <label className="block text-sm text-zinc-400 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={set(key)}
                required={required}
                minLength={key === 'password' ? 8 : undefined}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
                placeholder={placeholder}
              />
              {key === 'password' && (
                <p className="text-zinc-600 text-xs mt-1">{t('reg_password_hint')}</p>
              )}
            </div>
          ))}

          {/* Child registration toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={registerForChild}
              onChange={e => setRegisterForChild(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-brand"
            />
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
              {t('reg_for_child')}
            </span>
          </label>

          {registerForChild && (
            <div className="border border-brand/20 rounded-lg p-4 space-y-3 bg-brand/5">
              <p className="text-xs text-zinc-400">{t('reg_for_child_hint')}</p>
              <h3 className="text-sm font-semibold text-white">{t('reg_child_section')}</h3>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">{t('reg_child_firstname')}</label>
                <input
                  type="text"
                  value={child.firstName}
                  onChange={setChildField('firstName')}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
                  placeholder="Förnamn"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">{t('reg_child_lastname')}</label>
                <input
                  type="text"
                  value={child.lastName}
                  onChange={setChildField('lastName')}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
                  placeholder="Efternamn"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">{t('reg_child_dob')}</label>
                <input
                  type="date"
                  value={child.dateOfBirth}
                  onChange={setChildField('dateOfBirth')}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold py-2.5 rounded transition-colors text-sm"
          >
            {loading ? t('reg_loading') : t('reg_submit')}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          {t('reg_has_account')}{' '}
          <Link href="/login" className="text-brand hover:text-brand-hover transition-colors">
            {t('reg_login_link')}
          </Link>
        </p>
      </div>
    </div>
  )
}
