export type AppMode = 'review' | 'train' | 'play' | 'setup'

const MODES: { id: AppMode; icon: string; label: string }[] = [
  { id: 'review', icon: '🔍', label: 'Revisar' },
  { id: 'train',  icon: '🎯', label: 'Treino' },
  { id: 'play',   icon: '🤖', label: 'Jogar' },
  { id: 'setup',  icon: '✏️', label: 'Editor' },
]

interface ModeSwitcherProps {
  mode: AppMode
  onChange: (m: AppMode) => void
}

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
      {MODES.map((m) => {
        const active = mode === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={m.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--text-muted)',
              transition: 'all 0.12s',
            }}
          >
            <span style={{ fontSize: 14 }}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
