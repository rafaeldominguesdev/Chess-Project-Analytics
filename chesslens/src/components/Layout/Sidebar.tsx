import { BrandMarkIcon, GearIcon, TargetIcon } from './icons'

interface SidebarProps {
  onSettings: () => void
  onToggleTraining: () => void
  trainingActive: boolean
}

const ICON_BTN = 'cl-btn cl-btn-sm w-10 h-10'

/** Sidebar fixa à esquerda: marca e ações globais (treino, config). */
export function Sidebar({ onSettings, onToggleTraining, trainingActive }: SidebarProps) {
  return (
    <nav
      style={{
        width: 76, flexShrink: 0,
        position: 'sticky', top: 0,
        height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, padding: '16px 0',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        zIndex: 30,
      }}
    >
      <div title="ChessLens" style={{ color: 'var(--accent)', display: 'flex' }}>
        <BrandMarkIcon width={26} height={26} />
      </div>

      <div style={{ width: 32, height: 1, background: 'var(--border)' }} />

      <button
        className={`${ICON_BTN}${trainingActive ? ' cl-btn-selected' : ''}`}
        style={{ color: trainingActive ? undefined : 'var(--text)' }}
        onClick={onToggleTraining}
        title="Treino de táticas"
      >
        <TargetIcon width={19} height={19} />
      </button>

      <div style={{ flex: 1 }} />

      <button
        className={ICON_BTN}
        style={{ color: 'var(--text)' }}
        onClick={onSettings}
        title="Configurações"
      >
        <GearIcon width={19} height={19} />
      </button>
    </nav>
  )
}
