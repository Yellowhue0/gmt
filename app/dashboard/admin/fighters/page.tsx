'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, Sword, Shield, AlertTriangle, CheckCircle2, XCircle, Pencil, Trash2, Trophy, Plus, X, ChevronDown, ChevronUp, Calendar, Weight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

const WEIGHT_CLASSES = [
  'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Lightweight', 'Welterweight', 'Middleweight', 'Heavyweight',
]

const RESULTS = ['', 'WIN', 'LOSS', 'DRAW', 'NO_CONTEST'] as const
type ResultValue = '' | 'WIN' | 'LOSS' | 'DRAW' | 'NO_CONTEST'

type CompEntry = {
  id: string
  eventId: string
  event: { id: string; title: string; date: string; location: string | null }
  weightAtEntry: number | null
  opponent: string | null
  result: string | null
  notes: string | null
  enteredBy: string
}

type Fighter = {
  id: string
  name: string
  avatarUrl: string | null
  fighterCardNumber: string | null
  fighterCardExpiry: string | null
  weightClass: string | null
  currentWeight: number | null
  wins: number
  losses: number
  draws: number
  _count: { checkIns: number }
  competitionEntries: CompEntry[]
}

type Event = {
  id: string
  title: string
  date: string
  location: string | null
}

type CardStatus = 'valid' | 'expiring' | 'expired' | 'none'

function getCardStatus(expiry: string | null): CardStatus {
  if (!expiry) return 'none'
  const exp = new Date(expiry)
  const daysLeft = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 30) return 'expiring'
  return 'valid'
}

function resultKey(r: string | null): TranslationKey {
  if (r === 'WIN') return 'fight_result_win'
  if (r === 'LOSS') return 'fight_result_loss'
  if (r === 'DRAW') return 'fight_result_draw'
  if (r === 'NO_CONTEST') return 'fight_result_nc'
  return 'fight_result_pending'
}

function resultColor(r: string | null) {
  if (r === 'WIN') return 'text-green-400 bg-green-900/30 border-green-800/40'
  if (r === 'LOSS') return 'text-red-400 bg-red-900/30 border-red-800/40'
  if (r === 'DRAW') return 'text-yellow-400 bg-yellow-900/30 border-yellow-800/40'
  if (r === 'NO_CONTEST') return 'text-zinc-400 bg-zinc-800 border-zinc-700'
  return 'text-zinc-500 bg-zinc-800/60 border-zinc-700'
}

export default function FightersPage() {
  const { t } = useLanguage()
  const [fighters, setFighters] = useState<Fighter[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterWeight, setFilterWeight] = useState('')
  const [filterCard, setFilterCard] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'weight' | 'nextFight'>('name')

  // Edit modal
  const [editTarget, setEditTarget] = useState<Fighter | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'competitions'>('details')
  const [editForm, setEditForm] = useState({
    fighterCardNumber: '', fighterCardExpiry: '',
    weightClass: '', currentWeight: '',
    wins: 0, losses: 0, draws: 0,
  })
  const [editSaving, setEditSaving] = useState(false)

  // Entry management within edit modal
  const [addingEntry, setAddingEntry] = useState(false)
  const [newEntry, setNewEntry] = useState({ eventId: '', weightAtEntry: '', opponent: '', notes: '' })
  const [entrySaving, setEntrySaving] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editEntryForm, setEditEntryForm] = useState<{ opponent: string; result: ResultValue; notes: string }>({ opponent: '', result: '', notes: '' })
  const [entryUpdating, setEntryUpdating] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/fighters').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
    ]).then(([f, e]) => {
      setFighters(f.data ?? [])
      setEvents(e.data ?? [])
      setLoading(false)
    })
  }, [])

  const openEdit = (fighter: Fighter, tab: 'details' | 'competitions' = 'details') => {
    setEditTarget(fighter)
    setActiveTab(tab)
    setEditForm({
      fighterCardNumber: fighter.fighterCardNumber ?? '',
      fighterCardExpiry: fighter.fighterCardExpiry ? fighter.fighterCardExpiry.split('T')[0] : '',
      weightClass: fighter.weightClass ?? '',
      currentWeight: fighter.currentWeight?.toString() ?? '',
      wins: fighter.wins,
      losses: fighter.losses,
      draws: fighter.draws,
    })
    setAddingEntry(false)
    setEditingEntryId(null)
    setNewEntry({ eventId: '', weightAtEntry: '', opponent: '', notes: '' })
  }

  const closeEdit = () => {
    setEditTarget(null)
    setEditingEntryId(null)
    setAddingEntry(false)
  }

  const saveFighter = async () => {
    if (!editTarget) return
    setEditSaving(true)
    const res = await fetch(`/api/fighters/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const { data } = await res.json()
      setFighters(prev => prev.map(f => f.id === editTarget.id ? { ...f, ...data } : f))
      setEditTarget(prev => prev ? { ...prev, ...data } : null)
    }
    setEditSaving(false)
  }

  const addEntry = async () => {
    if (!editTarget || !newEntry.eventId) return
    setEntrySaving(true)
    const res = await fetch(`/api/fighters/${editTarget.id}/competitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    })
    if (res.ok) {
      const { data } = await res.json()
      const updatedFighter = { ...editTarget, competitionEntries: [...editTarget.competitionEntries, data] }
      setFighters(prev => prev.map(f => f.id === editTarget.id ? updatedFighter : f))
      setEditTarget(updatedFighter)
      setNewEntry({ eventId: '', weightAtEntry: '', opponent: '', notes: '' })
      setAddingEntry(false)
    }
    setEntrySaving(false)
  }

  const startEditEntry = (entry: CompEntry) => {
    setEditingEntryId(entry.id)
    setEditEntryForm({ opponent: entry.opponent ?? '', result: (entry.result ?? '') as ResultValue, notes: entry.notes ?? '' })
  }

  const saveEditEntry = async (entryId: string) => {
    if (!editTarget) return
    setEntryUpdating(true)
    const res = await fetch(`/api/fighters/${editTarget.id}/competitions/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editEntryForm),
    })
    if (res.ok) {
      const { data } = await res.json()
      const updatedEntries = editTarget.competitionEntries.map(e => e.id === entryId ? data : e)
      const updatedFighter = { ...editTarget, competitionEntries: updatedEntries }
      setFighters(prev => prev.map(f => f.id === editTarget.id ? updatedFighter : f))
      setEditTarget(updatedFighter)
      setEditingEntryId(null)
    }
    setEntryUpdating(false)
  }

  const deleteEntry = async (entryId: string) => {
    if (!editTarget) return
    setDeletingEntryId(entryId)
    const res = await fetch(`/api/fighters/${editTarget.id}/competitions/${entryId}`, { method: 'DELETE' })
    if (res.ok) {
      const updatedEntries = editTarget.competitionEntries.filter(e => e.id !== entryId)
      const updatedFighter = { ...editTarget, competitionEntries: updatedEntries }
      setFighters(prev => prev.map(f => f.id === editTarget.id ? updatedFighter : f))
      setEditTarget(updatedFighter)
    }
    setDeletingEntryId(null)
  }

  const now = new Date()

  const upcomingFightsByEvent = useMemo(() => {
    const map = new Map<string, { event: Event; fighters: { name: string; weightClass: string | null; opponent: string | null }[] }>()
    fighters.forEach(fighter => {
      fighter.competitionEntries.forEach(entry => {
        if (new Date(entry.event.date) >= now) {
          if (!map.has(entry.eventId)) {
            map.set(entry.eventId, { event: entry.event, fighters: [] })
          }
          map.get(entry.eventId)!.fighters.push({
            name: fighter.name,
            weightClass: fighter.weightClass,
            opponent: entry.opponent,
          })
        }
      })
    })
    return [...map.values()].sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighters])

  const filteredFighters = useMemo(() => {
    let list = [...fighters]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f => f.name.toLowerCase().includes(q))
    }
    if (filterWeight) list = list.filter(f => f.weightClass === filterWeight)
    if (filterCard) list = list.filter(f => getCardStatus(f.fighterCardExpiry) === filterCard)
    if (filterEvent) list = list.filter(f => f.competitionEntries.some(e => e.eventId === filterEvent))

    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'weight') list.sort((a, b) => (a.currentWeight ?? 999) - (b.currentWeight ?? 999))
    else if (sortBy === 'nextFight') {
      const nextDate = (f: Fighter) => {
        const e = f.competitionEntries.find(e => new Date(e.event.date) >= now)
        return e?.event.date ?? '9999-12-31'
      }
      list.sort((a, b) => nextDate(a).localeCompare(nextDate(b)))
    }
    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighters, search, filterWeight, filterCard, filterEvent, sortBy])

  if (loading) return <div className="text-zinc-600 text-center py-20">Laddar...</div>

  const CardStatusBadge = ({ expiry }: { expiry: string | null }) => {
    const status = getCardStatus(expiry)
    if (status === 'valid') return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} /> {t('fight_card_valid')}</span>
    if (status === 'expiring') return <span className="flex items-center gap-1 text-xs text-yellow-400"><AlertTriangle size={12} /> {t('fight_card_expiring')}</span>
    if (status === 'expired') return <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> {t('fight_card_expired')}</span>
    return <span className="flex items-center gap-1 text-xs text-zinc-600"><Shield size={12} /> {t('fight_card_none')}</span>
  }

  const upcomingEventsForFilter = useMemo(() => {
    const seen = new Set<string>()
    const result: Event[] = []
    fighters.forEach(f => f.competitionEntries.forEach(e => {
      if (!seen.has(e.eventId)) { seen.add(e.eventId); result.push(e.event) }
    }))
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [fighters])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {t('fight_title')}
        </h1>
        <p className="text-zinc-500 text-sm">{fighters.length} fighters registrerade</p>
      </div>

      {/* Upcoming Fights */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-brand" /> {t('fight_upcoming_fights')}
        </h2>
        {upcomingFightsByEvent.length === 0 ? (
          <p className="text-zinc-600 text-sm">{t('fight_no_upcoming')}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingFightsByEvent.map(({ event, fighters: entries }) => (
              <div key={event.id} className="bg-zinc-900 border border-brand/20 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{event.title}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{formatDate(new Date(event.date))}</p>
                    {event.location && <p className="text-zinc-600 text-xs">{event.location}</p>}
                  </div>
                  <span className="text-xs bg-brand/20 text-brand border border-brand/30 px-2 py-0.5 rounded-full font-medium">
                    {entries.length} {t('fight_fighters_badge')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {entries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Sword size={11} className="text-brand/60" />
                        <span className="text-zinc-300">{e.name}</span>
                        {e.weightClass && <span className="text-zinc-600">· {e.weightClass}</span>}
                      </div>
                      <span className="text-zinc-500">
                        {e.opponent ?? t('fight_opp_tbc')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('fight_search_ph')}
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-brand"
          />
        </div>

        <select
          value={filterWeight}
          onChange={e => setFilterWeight(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
        >
          <option value="">{t('fight_all')} {t('fight_filter_weight')}</option>
          {WEIGHT_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        <select
          value={filterCard}
          onChange={e => setFilterCard(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
        >
          <option value="">{t('fight_all')} {t('fight_filter_card')}</option>
          <option value="valid">{t('fight_card_valid')}</option>
          <option value="expiring">{t('fight_card_expiring')}</option>
          <option value="expired">{t('fight_card_expired')}</option>
          <option value="none">{t('fight_card_none')}</option>
        </select>

        {upcomingEventsForFilter.length > 0 && (
          <select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
          >
            <option value="">Alla tävlingar</option>
            {upcomingEventsForFilter.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        )}

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'weight' | 'nextFight')}
          className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
        >
          <option value="name">{t('fight_sort_by')}: {t('fight_sort_name')}</option>
          <option value="weight">{t('fight_sort_by')}: {t('fight_sort_weight')}</option>
          <option value="nextFight">{t('fight_sort_by')}: {t('fight_sort_next')}</option>
        </select>
      </div>

      {/* Fighters grid */}
      {filteredFighters.length === 0 ? (
        <p className="text-zinc-600 text-sm">{t('fight_no_fighters')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFighters.map(fighter => {
            const nextFight = fighter.competitionEntries.find(e => new Date(e.event.date) >= now)
            const cardStatus = getCardStatus(fighter.fighterCardExpiry)
            const initials = fighter.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

            return (
              <div key={fighter.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{fighter.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {fighter.weightClass && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Weight size={10} /> {fighter.weightClass}
                          {fighter.currentWeight ? ` · ${fighter.currentWeight}kg` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card status + record */}
                <div className="flex items-center justify-between mb-3">
                  <CardStatusBadge expiry={fighter.fighterCardExpiry} />
                  <span className="text-xs font-mono text-zinc-300">
                    <span className="text-green-400">{fighter.wins}{t('fight_wins')}</span>
                    {' '}<span className="text-zinc-600">·</span>{' '}
                    <span className="text-red-400">{fighter.losses}{t('fight_losses')}</span>
                    {' '}<span className="text-zinc-600">·</span>{' '}
                    <span className="text-yellow-500">{fighter.draws}{t('fight_draws')}</span>
                  </span>
                </div>

                {/* Card expiry */}
                {fighter.fighterCardExpiry && (
                  <p className={`text-xs mb-2 ${cardStatus === 'expiring' ? 'text-yellow-500' : cardStatus === 'expired' ? 'text-red-400' : 'text-zinc-600'}`}>
                    {t('fight_card_label')}: {fighter.fighterCardNumber ?? t('fight_no_card_num')} · {t('fight_expires')} {formatDate(new Date(fighter.fighterCardExpiry))}
                  </p>
                )}

                {/* Next fight */}
                {nextFight ? (
                  <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
                    <Calendar size={10} /> {t('fight_next_fight')}: <span className="text-zinc-300">{nextFight.event.title}</span> · {formatDate(new Date(nextFight.event.date))}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-700 mb-3">{t('fight_no_next_fight')}</p>
                )}

                {/* Fights count */}
                <p className="text-xs text-zinc-700 mb-4">{t('fight_total_fights')}: {fighter.competitionEntries.length}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(fighter, 'details')}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil size={11} /> {t('fight_edit')}
                  </button>
                  <button
                    onClick={() => openEdit(fighter, 'competitions')}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-brand/10 text-brand border border-brand/30 hover:bg-brand/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trophy size={11} /> {t('fight_enter_comp')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Competitions Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) closeEdit() }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-xs">
                  {editTarget.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <h2 className="text-white font-semibold">{editTarget.name}</h2>
              </div>
              <button onClick={closeEdit} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {(['details', 'competitions'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? 'text-brand border-b-2 border-brand' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {tab === 'details' ? t('fight_details_tab') : t('fight_competitions_tab')}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_card_number')}</label>
                      <input
                        value={editForm.fighterCardNumber}
                        onChange={e => setEditForm(f => ({ ...f, fighterCardNumber: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                        placeholder="—"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_card_expiry')}</label>
                      <input
                        type="date"
                        value={editForm.fighterCardExpiry}
                        onChange={e => setEditForm(f => ({ ...f, fighterCardExpiry: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_weight_class')}</label>
                      <select
                        value={editForm.weightClass}
                        onChange={e => setEditForm(f => ({ ...f, weightClass: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                      >
                        <option value="">—</option>
                        {WEIGHT_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_current_weight')}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.currentWeight}
                        onChange={e => setEditForm(f => ({ ...f, currentWeight: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_record')}</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['wins', 'losses', 'draws'] as const).map((field, i) => (
                        <div key={field}>
                          <label className="block text-[10px] text-zinc-600 mb-1">{[t('fight_wins_label'), t('fight_losses_label'), t('fight_draws_label')][i]}</label>
                          <input
                            type="number"
                            min="0"
                            value={editForm[field]}
                            onChange={e => setEditForm(f => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={saveFighter}
                    disabled={editSaving}
                    className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {editSaving ? t('fight_saving') : t('fight_save')}
                  </button>
                </div>
              )}

              {activeTab === 'competitions' && (
                <div className="space-y-3">
                  {editTarget.competitionEntries.length === 0 && !addingEntry && (
                    <p className="text-zinc-600 text-sm text-center py-4">{t('fight_no_entries')}</p>
                  )}

                  {editTarget.competitionEntries.map(entry => (
                    <div key={entry.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-800/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{entry.event.title}</p>
                          <p className="text-zinc-500 text-[10px]">{formatDate(new Date(entry.event.date))}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${resultColor(entry.result)}`}>
                            {t(resultKey(entry.result))}
                          </span>
                          <button
                            onClick={() => editingEntryId === entry.id ? setEditingEntryId(null) : startEditEntry(entry)}
                            className="text-zinc-500 hover:text-white transition-colors"
                          >
                            {editingEntryId === entry.id ? <ChevronUp size={14} /> : <Pencil size={12} />}
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            disabled={deletingEntryId === entry.id}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {editingEntryId === entry.id && (
                        <div className="p-3 space-y-2 border-t border-zinc-800">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1">{t('fight_opponent')}</label>
                              <input
                                value={editEntryForm.opponent}
                                onChange={e => setEditEntryForm(f => ({ ...f, opponent: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-brand"
                                placeholder={t('fight_opponent_ph')}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1">{t('fight_result')}</label>
                              <select
                                value={editEntryForm.result}
                                onChange={e => setEditEntryForm(f => ({ ...f, result: e.target.value as ResultValue }))}
                                className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-brand"
                              >
                                {RESULTS.map(r => (
                                  <option key={r} value={r}>
                                    {r === '' ? t('fight_result_pending') : r === 'WIN' ? t('fight_result_win') : r === 'LOSS' ? t('fight_result_loss') : r === 'DRAW' ? t('fight_result_draw') : t('fight_result_nc')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <textarea
                            value={editEntryForm.notes}
                            onChange={e => setEditEntryForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-brand resize-none"
                            rows={2}
                            placeholder={t('fight_notes_ph')}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditEntry(entry.id)}
                              disabled={entryUpdating}
                              className="flex-1 py-1.5 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-medium rounded transition-colors"
                            >
                              {entryUpdating ? t('fight_saving') : t('fight_save')}
                            </button>
                            <button onClick={() => setEditingEntryId(null)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded hover:text-white transition-colors">
                              {t('fight_cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add entry form */}
                  {addingEntry ? (
                    <div className="border border-brand/20 rounded-lg p-3 space-y-3 bg-brand/5">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_select_event')}</label>
                        <select
                          value={newEntry.eventId}
                          onChange={e => setNewEntry(f => ({ ...f, eventId: e.target.value }))}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                        >
                          <option value="">—</option>
                          {events.length === 0
                            ? <option disabled>{t('fight_no_events')}</option>
                            : events.map(e => <option key={e.id} value={e.id}>{e.title} · {formatDate(new Date(e.date))}</option>)
                          }
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_opponent_ph')}</label>
                          <input
                            value={newEntry.opponent}
                            onChange={e => setNewEntry(f => ({ ...f, opponent: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">{t('fight_weight_at_entry')}</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newEntry.weightAtEntry}
                            onChange={e => setNewEntry(f => ({ ...f, weightAtEntry: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                      <textarea
                        value={newEntry.notes}
                        onChange={e => setNewEntry(f => ({ ...f, notes: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand resize-none"
                        rows={2}
                        placeholder={t('fight_notes_ph')}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={addEntry}
                          disabled={entrySaving || !newEntry.eventId}
                          className="flex-1 py-2 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {entrySaving ? t('fight_saving') : t('fight_save')}
                        </button>
                        <button onClick={() => setAddingEntry(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:text-white transition-colors">
                          {t('fight_cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingEntry(true)}
                      className="w-full py-2 border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-sm rounded-lg transition-colors"
                    >
                      {t('fight_add_entry')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
