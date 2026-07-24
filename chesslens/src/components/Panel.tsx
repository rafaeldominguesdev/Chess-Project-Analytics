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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        ...style,
      }}
    >
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent)', flex: 1 }}>
          {title}
        </h3>
        {right}
      </header>
      <div style={{ padding: noPad ? 0 : 14 }}>{children}</div>
    </section>
  )
}
