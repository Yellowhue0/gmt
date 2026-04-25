'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock, LogOut } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PendingApprovalPage() {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.data?.isConfirmed) router.replace('/dashboard')
      })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Image
          src="/glommenlogo.svg"
          alt="GMT"
          width={64}
          height={64}
          className="mx-auto mb-6 object-contain"
        />

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-900/30 border border-yellow-800/40 mx-auto mb-5">
            <Clock size={28} className="text-yellow-400" />
          </div>

          <h1
            className="text-2xl font-bold text-white mb-3"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('pending_title')}
          </h1>

          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            {t('pending_body')}
          </p>

          <div className="bg-zinc-800/60 rounded-lg px-4 py-3 border border-zinc-700/50 text-zinc-500 text-xs text-left space-y-1">
            <p>{t('pending_notice1')}</p>
            <p>{t('pending_notice2')}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 mx-auto text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          <LogOut size={14} />
          {t('pending_logout')}
        </button>
      </div>
    </div>
  )
}
