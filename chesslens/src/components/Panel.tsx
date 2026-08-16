import type { ReactNode } from 'react'

interface PanelProps {
  icon?: string
  title: string
  right?: ReactNode
  children: ReactNode
  noPad?: boolean
  style?: React.CSSProperties
}

export function Panel({ icon, title, right, children, noPad, style }: PanelProps) {
  return (
    <section
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-gray-border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 12px 36px -8px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '11px 15px',
          borderBottom: '1px solid var(--color-gray-border)',
        }}
      >
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-blue-bright)', flex: 1 }}>
          {title}
        </h3>
        {right}
      </header>
      <div style={{ padding: noPad ? 0 : 15 }}>{children}</div>
    </section>
  )
}
