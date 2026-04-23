'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Något gick fel')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/glommenlogo.svg" alt="GMT" width={64} height={64} className="mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white">{t('login_title')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('login_welcome')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">{t('login_email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
              placeholder="din@epost.se"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">{t('login_password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold py-2.5 rounded transition-colors text-sm"
          >
            {loading ? t('login_loading') : t('login_submit')}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          {t('login_no_account')}{' '}
          <Link href="/register" className="text-brand hover:text-brand-hover transition-colors">
            {t('login_register_link')}
          </Link>
        </p>
      </div>
    </div>
  )
}
