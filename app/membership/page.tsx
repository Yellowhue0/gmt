'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'

type MemberData = {
  name: string
  role: string
  membershipPaid: boolean
  membershipEnd: string | null
}

export default function MembershipPage() {
  const { t } = useLanguage()
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.data) setMember(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tiers = [
    { title: t('mem_adult_title'), sub: t('mem_adult_age'), termPrice: 1200, totalPrice: 1400, highlight: true },
    { title: t('mem_youth_title'), sub: t('mem_youth_age'), termPrice: 900, totalPrice: 1100 },
    { title: t('mem_kids_title'), sub: t('mem_kids_age'), termPrice: 600, totalPrice: 800 },
    { title: t('mem_kids_sat_title'), sub: t('mem_kids_sat_desc'), termPrice: 350, totalPrice: 550 },
    { title: t('mem_casual_title'), sub: t('mem_casual_desc'), termPrice: 700, totalPrice: 900 },
  ]

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="text-center mb-10">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-2">{t('mem_subtitle')}</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white uppercase tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
            {t('mem_title')}
          </h1>
        </div>

        {/* 2026 annual fee announcement */}
        <div className="mb-10 border border-yellow-500/40 bg-yellow-500/5 rounded-xl p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500" />
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <span className="inline-flex items-center shrink-0 px-3 py-1 rounded-full text-xs font-bold tracking-widest bg-red-600 text-white uppercase">
              {t('mem_annual_badge')}
            </span>
            <div>
              <p className="text-yellow-400 font-bold text-lg leading-tight">{t('mem_annual_title')}</p>
              <p className="text-zinc-400 text-sm mt-1.5">{t('mem_annual_desc')}</p>
            </div>
          </div>
        </div>

        {/* Membership tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {tiers.map(tier => (
            <div
              key={tier.title}
              className={`relative rounded-xl border p-5 flex flex-col gap-3 ${
                tier.highlight ? 'border-brand/60 bg-brand/5' : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-px left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent" />
              )}
              <div>
                <h2 className="text-white font-bold text-lg tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
                  {tier.title}
                </h2>
                <p className="text-zinc-500 text-sm mt-0.5">{tier.sub}</p>
              </div>
              <div className="mt-auto pt-3 border-t border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{t('mem_term_label')}</span>
                  <span className="text-white font-medium">{tier.termPrice} kr{t('mem_per_term')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{t('mem_annual_fee_note')}</span>
                  <span className="text-yellow-400 font-medium">200 kr{t('mem_per_year')}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-700/50">
                  <span className="text-white font-semibold text-sm">{t('mem_total_label')}</span>
                  <span className="text-white font-bold text-xl">{tier.totalPrice} kr</span>
                </div>
              </div>
            </div>
          ))}

          {/* Trial class — separate card */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-3">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
                {t('mem_trial_title')}
              </h2>
              <p className="text-zinc-500 text-sm mt-0.5">{t('mem_trial_desc')}</p>
            </div>
            <div className="mt-auto pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">{t('mem_one_time')}</span>
                <span className="text-white font-bold text-xl">100 kr</span>
              </div>
              <p className="text-red-400 text-xs font-semibold mt-2">{t('mem_trial_warning')}</p>
            </div>
          </div>
        </div>

        {/* Member status (logged-in users) */}
        {!loading && member && (
          <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h3 className="text-white font-bold text-lg mb-4 uppercase tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
              {t('mem_your_membership')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('mem_type_label')}</p>
                <p className="text-white font-semibold">{member.role}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('mem_expires_label')}</p>
                <p className="text-white font-semibold">
                  {member.membershipEnd ? formatDate(member.membershipEnd) : t('mem_no_expiry')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('mem_status_label')}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  member.membershipPaid
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {member.membershipPaid ? t('mem_status_paid') : t('mem_status_unpaid')}
                </span>
              </div>
            </div>
            <p className="text-zinc-600 text-xs mt-4">{t('mem_contact_admin')}</p>
          </div>
        )}

        {/* Payment info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 mb-8">
          <h3 className="text-white font-bold text-lg mb-5 uppercase tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
            {t('mem_payment_title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5">{t('mem_swish_label')}</p>
              <p className="text-white font-bold text-2xl tracking-wider">123 687 9175</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5">{t('mem_bankgiro_label')}</p>
              <p className="text-white font-bold text-2xl tracking-wider">5807-9583</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5">{t('mem_swish_qr_label')}</p>
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center">
                <p className="text-zinc-600 text-xs text-center leading-snug px-2">{t('mem_swish_qr_soon')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Register CTA */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-brand hover:bg-brand-hover text-white font-bold text-sm uppercase tracking-widest rounded-lg transition-colors"
          >
            {t('mem_register_btn')}
          </Link>
        </div>

      </div>
    </main>
  )
}
