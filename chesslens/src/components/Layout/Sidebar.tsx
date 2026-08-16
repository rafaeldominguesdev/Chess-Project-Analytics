import { useState, type ReactNode } from 'react'
import { AnalyzeNavIcon, BoardNavIcon, BrandMarkIcon, ChevronIcon, GearIcon, TargetIcon } from './icons'

interface SidebarProps {
  onSettings: () => void
  onToggleTraining: () => void
  onToggleBoard: () => void
  onGoHome: () => void
  trainingActive: boolean
  boardActive: boolean
}

const COLLAPSED_KEY = 'chesslens-sidebar-collapsed'
const WIDTH_EXPANDED = 206
const WIDTH_COLLAPSED = 60

/** Sidebar fixa à esquerda: marca e navegação principal (analisar, treino, config) com rótulo — não só ícone.
 *  Pode encolher pra só ícones (like ChatGPT) — o botão fica colado no topo, ao lado da marca, e o estado
 *  persiste entre sessões (localStorage), já que é preferência de layout, não algo que muda por partida. */
export function Sidebar({ onSettings, onToggleTraining, onToggleBoard, onGoHome, trainingActive, boardActive }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <nav
      style={{
        width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED, flexShrink: 0,
        position: 'sticky', top: 0,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        gap: 4, padding: collapsed ? '18px 10px' : '18px 14px',
        background: 'var(--color-bg-panel)',
        borderRight: '1px solid var(--color-gray-border)',
        zIndex: 30,
        transition: 'width var(--dur-enter) var(--ease-snap), padding var(--dur-enter) var(--ease-snap)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16,
        // Colapsada, a marca e o botão de toggle não cabem lado a lado (60px de largura total,
        // menos padding, não sobra espaço pros dois) — empilha em duas linhas centralizadas.
        flexDirection: collapsed ? 'column' : 'row',
      }}>
        {!collapsed && (
          <button
            onClick={onGoHome}
            title="ChessLens"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0,
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              padding: '0 4px',
            }}
          >
            <span style={{ color: 'var(--color-blue-bright)', display: 'flex', flexShrink: 0 }}>
              <BrandMarkIcon width={22} height={22} />
            </span>
            <span className="cl-display" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--color-text-on-dark)', whiteSpace: 'nowrap' }}>ChessLens</span>
          </button>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Encolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Encolher menu'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, flexShrink: 0, padding: 0,
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-gray-border)',
            background: 'var(--color-bg-raised)', color: 'var(--color-text-on-dark)', cursor: 'pointer',
            transition: 'background-color var(--dur-tap) var(--ease-tap), border-color var(--dur-tap) var(--ease-tap)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-blue-bright)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-border)' }}
        >
          <ChevronIcon width={15} height={15} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-enter) var(--ease-snap)' }} />
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--color-gray-border)', marginBottom: 14 }} />

      {!collapsed && (
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-gray-muted)', padding: '0 6px', marginBottom: 6, whiteSpace: 'nowrap',
        }}>
          Menu
        </span>
      )}

      <NavItem icon={<AnalyzeNavIcon width={17} height={17} />} label="Analisar" active={!trainingActive && !boardActive} onClick={onGoHome} collapsed={collapsed} />
      <NavItem icon={<BoardNavIcon width={17} height={17} />} label="Tabuleiro" active={boardActive} onClick={onToggleBoard} collapsed={collapsed} />
      <NavItem icon={<TargetIcon width={17} height={17} />} label="Treino" active={trainingActive} onClick={onToggleTraining} collapsed={collapsed} />

      <div style={{ flex: 1 }} />

      <NavItem icon={<GearIcon width={17} height={17} />} label="Configurações" onClick={onSettings} collapsed={collapsed} />
    </nav>
  )
}

function NavItem({ icon, label, active = false, collapsed, onClick }: { icon: ReactNode; label: string; active?: boolean; collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`cl-btn${active ? ' cl-btn-selected' : ''}`}
      style={{
        justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, width: '100%',
        padding: collapsed ? '9px 0' : '9px 12px', fontSize: 11.5, letterSpacing: '0.5px',
      }}
    >
      {icon}
      {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  )
}
