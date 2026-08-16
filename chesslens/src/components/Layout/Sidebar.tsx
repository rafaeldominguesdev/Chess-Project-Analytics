import type { ReactNode } from 'react'
import { AnalyzeNavIcon, BrandMarkIcon, GearIcon, TargetIcon } from './icons'

interface SidebarProps {
  onSettings: () => void
  onToggleTraining: () => void
  onGoHome: () => void
  trainingActive: boolean
}

/** Sidebar fixa à esquerda: marca e navegação principal (analisar, treino, config) com rótulo — não só ícone. */
export function Sidebar({ onSettings, onToggleTraining, onGoHome, trainingActive }: SidebarProps) {
  return (
    <nav
      style={{
        width: 190, flexShrink: 0,
        position: 'sticky', top: 0,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        gap: 4, padding: '18px 14px',
        background: 'var(--color-bg-panel)',
        borderRight: '1px solid var(--color-gray-border)',
        zIndex: 30,
      }}
    >
      <button
        onClick={onGoHome}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          padding: '0 4px 16px',
        }}
      >
        <span style={{ color: 'var(--color-blue-bright)', display: 'flex', flexShrink: 0 }}>
          <BrandMarkIcon width={24} height={24} />
        </span>
        <span className="cl-display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-on-dark)' }}>ChessLens</span>
      </button>

      <div style={{ height: 1, background: 'var(--color-gray-border)', marginBottom: 14 }} />

      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--color-gray-muted)', padding: '0 6px', marginBottom: 6,
      }}>
        Menu
      </span>

      <NavItem icon={<AnalyzeNavIcon width={17} height={17} />} label="Analisar" active={!trainingActive} onClick={onGoHome} />
      <NavItem icon={<TargetIcon width={17} height={17} />} label="Treino" active={trainingActive} onClick={onToggleTraining} />

      <div style={{ flex: 1 }} />

      <NavItem icon={<GearIcon width={17} height={17} />} label="Configurações" onClick={onSettings} />
    </nav>
  )
}

function NavItem({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`cl-btn${active ? ' cl-btn-selected' : ''}`}
      style={{ justifyContent: 'flex-start', gap: 10, width: '100%', padding: '9px 12px', fontSize: 11.5, letterSpacing: '0.5px' }}
    >
      {icon}
      {label}
    </button>
  )
}
