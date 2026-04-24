'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type Trainer = { id: string; name: string; role: string }

type SessionData = {
  id?: string
  name: string
  description: string
  startTime: string
  endTime: string
  maxCapacity: number
  type: string
  classType: string
  visibility: string
  isRecurring: boolean
  seriesId?: string | null
  dayOfWeek?: number
  date?: string | null
  trainers?: { id: string; name: string }[]
}

type Props = {
  session?: SessionData | null
  onClose: () => void
  onSaved: () => void
}

const SESSION_TYPES = [
  { value: 'regular', label: 'Träning' },
  { value: 'sparring', label: 'Sparring' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'youth', label: 'Ungdom' },
  { value: 'conditioning', label: 'Kondition' },
  { value: 'girls', label: 'Tjejklass' },
]

const DAY_LABELS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

export default function SessionFormModal({ session, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const isEdit = !!session?.id

  const [name, setName] = useState(session?.name ?? '')
  const [description, setDescription] = useState(session?.description ?? '')
  const [startTime, setStartTime] = useState(session?.startTime ?? '18:00')
  const [endTime, setEndTime] = useState(session?.endTime ?? '19:30')
  const [maxCapacity, setMaxCapacity] = useState(session?.maxCapacity ?? 20)
  const [type, setType] = useState(session?.type ?? 'regular')
  const [classType, setClassType] = useState(session?.classType ?? 'REGULAR')
  const [visibility, setVisibility] = useState(session?.visibility ?? 'PUBLIC')
  const [isRecurring, setIsRecurring] = useState(session?.isRecurring ?? true)
  const [recurringDays, setRecurringDays] = useState<number[]>(
    session?.isRecurring && session.dayOfWeek !== undefined ? [session.dayOfWeek] : [1]
  )
  const [date, setDate] = useState(
    session?.date ? session.date.split('T')[0] : ''
  )
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>(
    session?.trainers?.map((t) => t.id) ?? []
  )
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [editMode, setEditMode] = useState<'this' | 'all'>('this')
  const [showRecurringChoice, setShowRecurringChoice] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users?roles=TRAINER,ADMIN')
      .then((r) => r.json())
      .then((d) => setTrainers(d.data ?? []))
  }, [])

  const toggleDay = (dow: number) => {
    setRecurringDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    )
  }

  const toggleTrainer = (id: string) => {
    setSelectedTrainers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (resolvedEditMode?: 'this' | 'all') => {
    setError('')
    if (!name.trim()) { setError('Passnamn krävs'); return }
    if (!startTime || !endTime) { setError('Tid krävs'); return }
    if (!isRecurring && !date) { setError('Datum krävs för engångstillfälle'); return }
    if (isRecurring && recurringDays.length === 0) { setError('Välj minst en dag'); return }

    setSaving(true)
    try {
      if (isEdit) {
        const mode = resolvedEditMode ?? editMode
        const res = await fetch(`/api/sessions/${session!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            startTime,
            endTime,
            maxCapacity: Number(maxCapacity),
            type,
            classType,
            visibility,
            trainerIds: selectedTrainers,
            editMode: mode,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Något gick fel')
          return
        }
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            startTime,
            endTime,
            maxCapacity: Number(maxCapacity),
            type,
            classType,
            visibility,
            isRecurring,
            recurringDays: isRecurring ? recurringDays : [],
            dayOfWeek: isRecurring ? recurringDays[0] : undefined,
            date: isRecurring ? undefined : date,
            trainerIds: selectedTrainers,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Något gick fel')
          return
        }
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  // For editing a recurring session, ask which scope
  const onSaveClick = () => {
    if (isEdit && session?.isRecurring && session.seriesId) {
      setShowRecurringChoice(true)
    } else {
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-white font-semibold text-lg">
            {isEdit ? t('sess_edit') : t('sess_create_class')}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Recurring scope dialog */}
        {showRecurringChoice && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm">
              <h3 className="text-white font-semibold mb-2">{t('sess_edit_recurring_title')}</h3>
              <p className="text-zinc-400 text-sm mb-5">Vill du redigera bara detta pass eller hela serien?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRecurringChoice(false); handleSubmit('this') }}
                  className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
                >
                  {t('sess_edit_this_only')}
                </button>
                <button
                  onClick={() => { setShowRecurringChoice(false); handleSubmit('all') }}
                  className="flex-1 py-2 rounded-lg bg-brand text-white text-sm hover:bg-brand-hover transition-colors"
                >
                  {t('sess_edit_all_future')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_name_label')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
              placeholder="t.ex. Nybörjar/Motionärer"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_desc_label')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand resize-none"
              placeholder="Kort beskrivning..."
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_start_label')}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_end_label')}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Max capacity */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_cap_label')}</label>
            <input
              type="number"
              min={1}
              max={200}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Session type */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_type_label')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
            >
              {SESSION_TYPES.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Class type */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_class_type_label')}</label>
            <select
              value={classType}
              onChange={(e) => setClassType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
            >
              <option value="REGULAR">{t('sess_ct_regular')}</option>
              <option value="SPECIAL">{t('sess_ct_special')}</option>
              <option value="FIGHTERS_ONLY">{t('sess_ct_fighters')}</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_visibility_label')}</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
            >
              <option value="PUBLIC">{t('sess_vis_public')}</option>
              <option value="MEMBERS_ONLY">{t('sess_vis_members')}</option>
              <option value="FIGHTERS_ONLY">{t('sess_vis_fighters')}</option>
              <option value="TRAINERS_ONLY">{t('sess_vis_trainers')}</option>
              <option value="HIDDEN">{t('sess_vis_hidden')}</option>
            </select>
          </div>

          {/* Recurring toggle — only show on create */}
          {!isEdit && (
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setIsRecurring((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors ${isRecurring ? 'bg-brand' : 'bg-zinc-700'} relative`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </div>
                <span className="text-sm text-zinc-300">{t('sess_recurring_label')}</span>
              </label>
            </div>
          )}

          {/* Recurring days */}
          {isRecurring && !isEdit && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">{t('sess_recurring_days_label')}</label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((day, dow) => (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      recurringDays.includes(dow)
                        ? 'bg-brand border-brand text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date for one-time session */}
          {!isRecurring && !isEdit && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sess_date_label')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
          )}

          {/* Trainer multi-select */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">{t('sess_trainers_label')}</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {trainers.map((tr) => (
                <label key={tr.id} className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-zinc-800 transition-colors">
                  <div
                    onClick={() => toggleTrainer(tr.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedTrainers.includes(tr.id)
                        ? 'bg-brand border-brand'
                        : 'border-zinc-600 bg-zinc-800'
                    }`}
                  >
                    {selectedTrainers.includes(tr.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-zinc-300">{tr.name}</span>
                  <span className="text-xs text-zinc-600 ml-auto">{tr.role}</span>
                </label>
              ))}
              {trainers.length === 0 && (
                <p className="text-zinc-600 text-xs px-2">Inga tränare hittades</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
            >
              {t('sess_cancel')}
            </button>
            <button
              onClick={onSaveClick}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? t('sess_saving') : t('sess_save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
