'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    // Always show success — never reveal if email exists
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/glommenlogo.svg" alt="GMT" width={64} height={64} className="mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white">{t('fp_title')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('fp_sub')}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-800/40 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{t('fp_success')}</p>
              <Link
                href="/login"
                className="inline-block mt-2 text-brand hover:text-brand-hover text-sm transition-colors"
              >
                {t('fp_back')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">{t('fp_email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-zinc-600"
                  placeholder="din@epost.se"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold py-2.5 rounded transition-colors text-sm"
              >
                {loading ? t('fp_submitting') : t('fp_submit')}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <p className="text-center text-zinc-500 text-sm mt-4">
            <Link href="/login" className="text-brand hover:text-brand-hover transition-colors">
              {t('fp_back')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
