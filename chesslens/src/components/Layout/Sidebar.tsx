import { useState, type ReactNode } from 'react'
import { AnalyzeNavIcon, BoardNavIcon, BrandMarkIcon, ChevronIcon, GearIcon, PositionSetupIcon, TargetIcon, WrenchIcon } from './icons'

interface SidebarProps {
  onSettings: () => void
  onToggleTraining: () => void
  onToggleBoard: () => void
  onGoHome: () => void
  onAnalyzeClick: () => void
  onMaintenanceClick: (feature: string) => void
  onTogglePositionEditor: () => void
  trainingActive: boolean
  boardActive: boolean
  positionEditorActive: boolean
  searchActive: boolean
}

const COLLAPSED_KEY = 'chesslens-sidebar-collapsed'
const TOOLS_OPEN_KEY = 'chesslens-sidebar-tools-open'
const WIDTH_EXPANDED = 254
const WIDTH_COLLAPSED = 60

// Estrutura de menu inspirada na sidebar do chessigma.com (Treino / Ferramentas), sem a parte
// comercial deles (preço, loja, blog) — não faz sentido num projeto pessoal. Lista enxuta, só o
// que tem chance real de virar funcionalidade — o resto dos itens do chessigma (Woodpecker,
// Blunder Shield, Sparring, Treino de Conversão, Próximo Lance, Calculadora de Elo) foi tirado.
const TRAIN_PLACEHOLDERS = ['Treino de Erros', 'Treino de Aberturas']

/** Sidebar fixa à esquerda: marca e navegação principal. "Treino" é uma lista simples (Puzzles +
 *  placeholders); "Ferramentas" é um grupo que expande/recolhe (Analisar, Tabuleiro, Definir
 *  Posição) — igual pasta de acordeão, clica no cabeçalho pra abrir/fechar, começa aberto quando
 *  alguma ferramenta de dentro tá ativa (senão o usuário perderia a navegação principal escondida).
 *  Itens "em breve" aparecem cinzas com a etiqueta e abrem um aviso de manutenção ao clicar, em
 *  vez de não fazer nada. Pode encolher a sidebar inteira pra só ícones (like ChatGPT) — o botão
 *  fica colado no topo, ao lado da marca — e os dois estados (colapsada / ferramentas aberta)
 *  persistem entre sessões (localStorage), já que são preferência de layout, não algo que muda
 *  por partida. Rola internamente (overflowY) porque com tudo expandido não cabe numa tela baixa. */
export function Sidebar({ onSettings, onToggleTraining, onToggleBoard, onGoHome, onAnalyzeClick, onMaintenanceClick, onTogglePositionEditor, trainingActive, boardActive, positionEditorActive, searchActive }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    // Sem preferência salva ainda: começa colapsada (só ícones) em telas estreitas, senão a
    // sidebar expandida sozinha já ocupa a maior parte de uma tela de celular.
    return saved !== null ? saved === '1' : window.innerWidth < 640
  })
  const [toolsOpen, setToolsOpen] = useState(() => {
    const saved = localStorage.getItem(TOOLS_OPEN_KEY)
    // Sem preferência salva ainda: começa aberto se alguma ferramenta de dentro já tá ativa
    // (Analisar é a tela padrão do app), senão o usuário perde a navegação principal de cara.
    return saved !== null ? saved === '1' : !trainingActive
  })

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  function toggleTools() {
    setToolsOpen(prev => {
      const next = !prev
      localStorage.setItem(TOOLS_OPEN_KEY, next ? '1' : '0')
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
        padding: collapsed ? '18px 10px' : '18px 14px',
        background: 'var(--color-bg-panel)',
        borderRight: '1px solid var(--color-gray-border)',
        zIndex: 30,
        transition: 'width var(--dur-enter) var(--ease-snap), padding var(--dur-enter) var(--ease-snap)',
        overflowX: 'hidden', overflowY: 'auto',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18,
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
              <BrandMarkIcon width={24} height={24} />
            </span>
            <span className="cl-display" style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-on-dark)', whiteSpace: 'nowrap' }}>ChessLens</span>
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

      <div style={{ height: 1, background: 'var(--color-gray-border)', marginBottom: 18 }} />

      <NavSection label="Treino" collapsed={collapsed}>
        <NavItem icon={<TargetIcon width={20} height={20} />} label="Puzzles" active={trainingActive} onClick={onToggleTraining} collapsed={collapsed} />
        {TRAIN_PLACEHOLDERS.map((label) => (
          <NavItem key={label} icon={<WrenchIcon width={19} height={19} />} label={label} collapsed={collapsed} soon
            onClick={() => onMaintenanceClick(label)} />
        ))}
      </NavSection>

      {/* "Ferramentas" — grupo que abre/fecha (pasta de acordeão), não uma lista fixa como Treino.
          Colapsada, os 3 ícones aparecem direto, sem cabeçalho (não tem texto pra clicar mesmo). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 16 }}>
        {!collapsed && (
          <button
            onClick={toggleTools}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              padding: '0 6px', marginBottom: 5,
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--color-gray-muted)', whiteSpace: 'nowrap', flex: 1,
            }}>
              Ferramentas
            </span>
            <ChevronIcon width={11} height={11} style={{
              color: 'var(--color-gray-muted)', transform: toolsOpen ? 'rotate(-90deg)' : 'rotate(-180deg)',
              transition: 'transform var(--dur-tap) var(--ease-tap)', flexShrink: 0,
            }} />
          </button>
        )}
        {(collapsed || toolsOpen) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <NavItem icon={<AnalyzeNavIcon width={20} height={20} />} label="Analisar" active={searchActive} onClick={onAnalyzeClick} collapsed={collapsed} />
            <NavItem icon={<BoardNavIcon width={20} height={20} />} label="Tabuleiro" active={boardActive} onClick={onToggleBoard} collapsed={collapsed} />
            <NavItem icon={<PositionSetupIcon width={20} height={20} />} label="Definir Posição" active={positionEditorActive} onClick={onTogglePositionEditor} collapsed={collapsed} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />

      <NavItem icon={<GearIcon width={20} height={20} />} label="Configurações" onClick={onSettings} collapsed={collapsed} />
    </nav>
  )
}

function NavSection({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 16 }}>
      {!collapsed && (
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-gray-muted)', padding: '0 6px', marginBottom: 5, whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

function NavItem({ icon, label, active = false, collapsed, soon = false, onClick }: {
  icon: ReactNode; label: string; active?: boolean; collapsed: boolean; soon?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label + (soon ? ' (em breve)' : '') : undefined}
      aria-label={collapsed ? label + (soon ? ' (em breve)' : '') : undefined}
      aria-current={active ? 'page' : undefined}
      className={`cl-btn${active ? ' cl-btn-selected' : ''}`}
      style={{
        justifyContent: collapsed ? 'center' : 'flex-start', gap: 9, width: '100%',
        padding: collapsed ? '10px 0' : '10px 11px', fontSize: soon ? 11.5 : 12, letterSpacing: '0.3px',
        opacity: soon ? 0.55 : 1,
      }}
    >
      {icon}
      {!collapsed && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {soon && (
            <span style={{
              marginLeft: 'auto', fontSize: 8, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase',
              padding: '2px 4px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
              background: 'var(--color-bg-main)', color: 'var(--color-gray-muted)',
            }}>
              em breve
            </span>
          )}
        </span>
      )}
    </button>
  )
}
