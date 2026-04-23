'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

type UserOption = { id: string; name: string }

type Props = {
  value: string
  onChange: (value: string) => void
  onMentionsChange: (ids: string[]) => void
  placeholder?: string
  rows?: number
  className?: string
}

export default function MentionTextarea({ value, onChange, onMentionsChange, placeholder, rows = 4, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [queryStart, setQueryStart] = useState(0)
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set())
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setAllUsers(d.data ?? []))
  }, [])

  const filtered = query !== null
    ? allUsers.filter(u => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionStart ?? 0
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/@(\w*)$/)

    if (match) {
      setQuery(match[1])
      setQueryStart(cursor - match[0].length)
      setActiveIndex(0)
    } else {
      setQuery(null)
    }

    onChange(val)
  }, [onChange])

  const selectUser = useCallback((user: UserOption) => {
    if (!ref.current) return
    const cursor = ref.current.selectionStart ?? 0
    const firstName = user.name.split(' ')[0]
    const before = value.slice(0, queryStart)
    const after = value.slice(cursor)
    const newVal = `${before}@${firstName} ${after}`
    onChange(newVal)

    const newIds = new Set(mentionedIds)
    newIds.add(user.id)
    setMentionedIds(newIds)
    onMentionsChange([...newIds])
    setQuery(null)

    // Restore focus and move cursor after inserted mention
    setTimeout(() => {
      if (ref.current) {
        const pos = before.length + firstName.length + 2
        ref.current.focus()
        ref.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [value, queryStart, mentionedIds, onChange, onMentionsChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (query === null || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectUser(filtered[activeIndex]) }
    if (e.key === 'Escape') setQuery(null)
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
      {query !== null && filtered.length > 0 && (
        <div className="absolute z-50 left-0 mt-1 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {filtered.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); selectUser(u) }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                i === activeIndex ? 'bg-brand text-white' : 'text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </span>
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
