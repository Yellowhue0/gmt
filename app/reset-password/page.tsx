'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'

function ResetPasswordForm() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'success'>('validating')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? setStatus('valid') : setStatus('invalid'))
      .catch(() => setStatus('invalid'))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError(t('rp_mismatch'))
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    if (res.ok) {
      setStatus('success')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Något gick fel')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/glommenlogo.svg" alt="GMT" width={64} height={64} className="mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white">{t('rp_title')}</h1>
          {status === 'valid' && (
            <p className="text-zinc-500 text-sm mt-1">{t('rp_sub')}</p>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {status === 'validating' && (
            <p className="text-center text-zinc-500 text-sm py-4">{t('rp_validating')}</p>
          )}

          {status === 'invalid' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-800/40 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{t('rp_invalid')}</p>
              <Link
                href="/forgot-password"
                className="inline-block mt-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
              >
                {t('rp_new_request')}
              </Link>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-800/40 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{t('rp_success')}</p>
              <Link
                href="/login"
                className="inline-block mt-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
              >
                {t('rp_go_login')}
              </Link>
            </div>
          )}

          {status === 'valid' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">{t('rp_new_pass')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">{t('rp_confirm_pass')}</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold py-2.5 rounded transition-colors text-sm"
              >
                {loading ? t('rp_submitting') : t('rp_submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
