type Props = {
  role: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const ROLE_CONFIG: Record<string, { emoji: string; label: string; className: string }> = {
  ADMIN:   { emoji: '⚙️', label: 'Admin',    className: 'bg-zinc-700/80 text-zinc-200 border border-zinc-600/50' },
  TRAINER: { emoji: '🏆', label: 'Tränare',  className: 'bg-blue-900/40 text-blue-300 border border-blue-800/50' },
  FIGHTER: { emoji: '🥊', label: 'Fighter',  className: 'bg-red-900/40 text-red-400 border border-red-800/50' },
  FINANCE: { emoji: '💼', label: 'Ekonomi',  className: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40' },
  MEMBER:  { emoji: '',   label: '',          className: '' },
}

export default function RoleBadge({ role, size = 'sm', showLabel = true }: Props) {
  const config = ROLE_CONFIG[role]
  if (!config || (!config.emoji && !config.label)) return null

  const textSize = size === 'md' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'

  return (
    <span className={`inline-flex items-center gap-0.5 rounded font-bold uppercase tracking-wide ${textSize} ${config.className}`}>
      {config.emoji && <span>{config.emoji}</span>}
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

export function getRoleEmoji(role: string): string {
  return ROLE_CONFIG[role]?.emoji ?? ''
}
