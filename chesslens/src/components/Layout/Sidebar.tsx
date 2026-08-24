import { useState, type ReactNode } from 'react'
import { AnalyzeNavIcon, BoardNavIcon, BookNavIcon, ChevronIcon, EndgameNavIcon, ErrorTrainNavIcon, GearIcon, PlayBotNavIcon, PositionSetupIcon, ReportNavIcon, SunNavIcon, TargetIcon, WrenchIcon } from './icons'

interface SidebarProps {
  onSettings: () => void
  onUpdates: () => void
  onToggleTraining: () => void
  onToggleBoard: () => void
  onToggleOpeningTraining: () => void
  onToggleErrorTraining: () => void
  onToggleEndgameTraining: () => void
  onToggleReport: () => void
  onTogglePlayBot: () => void
  onGoHome: () => void
  onAnalyzeClick: () => void
  onMaintenanceClick: (feature: string) => void
  onTogglePositionEditor: () => void
  trainingActive: boolean
  boardActive: boolean
  openingTrainingActive: boolean
  errorTrainingActive: boolean
  endgameTrainingActive: boolean
  reportActive: boolean
  playBotActive: boolean
  positionEditorActive: boolean
  searchActive: boolean
}

const COLLAPSED_KEY = 'chesslens-sidebar-collapsed'
const TOOLS_OPEN_KEY = 'chesslens-sidebar-tools-open'
// Aumentado a pedido direto do usuário: "deixe maior a sidebar e os icones e texto esta
// apertado" — eram 254/60, ícones 19-20px e fonte 10-12px, ficando apertado visualmente.
const WIDTH_EXPANDED = 278
const WIDTH_COLLAPSED = 68

// Estrutura de menu inspirada na sidebar do chessigma.com (Treino / Ferramentas), sem a parte
// comercial deles (preço, loja, blog) — não faz sentido num projeto pessoal. Lista enxuta, só o
// que tem chance real de virar funcionalidade — o resto dos itens do chessigma (Woodpecker,
// Blunder Shield, Sparring, Treino de Conversão, Próximo Lance, Calculadora de Elo) foi tirado.
// "Treino de Aberturas" e "Treino de Erros" saíram daqui — viraram funcionalidade de verdade,
// cada um com `NavItem` próprio abaixo.
const TRAIN_PLACEHOLDERS: string[] = []

/** Sidebar fixa à esquerda: marca e navegação principal. "Treino" é uma lista simples (Puzzles +
 *  placeholders); "Ferramentas" é um grupo que expande/recolhe (Analisar, Tabuleiro, Definir
 *  Posição) — igual pasta de acordeão, clica no cabeçalho pra abrir/fechar, começa aberto quando
 *  alguma ferramenta de dentro tá ativa (senão o usuário perderia a navegação principal escondida).
 *  Itens "em breve" aparecem cinzas com a etiqueta e abrem um aviso de manutenção ao clicar, em
 *  vez de não fazer nada. Pode encolher a sidebar inteira pra só ícones (like ChatGPT) — o botão
 *  fica colado no topo, ao lado da marca — e os dois estados (colapsada / ferramentas aberta)
 *  persistem entre sessões (localStorage), já que são preferência de layout, não algo que muda
 *  por partida. Rola internamente (overflowY) porque com tudo expandido não cabe numa tela baixa. */
export function Sidebar({ onSettings, onUpdates, onToggleTraining, onToggleBoard, onToggleOpeningTraining, onToggleErrorTraining, onToggleEndgameTraining, onToggleReport, onTogglePlayBot, onGoHome, onAnalyzeClick, onMaintenanceClick, onTogglePositionEditor, trainingActive, boardActive, openingTrainingActive, errorTrainingActive, endgameTrainingActive, reportActive, playBotActive, positionEditorActive, searchActive }: SidebarProps) {
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
        // Um tom mais escuro que o resto do app (--color-bg-panel), não o mesmo — pedido direto
        // do usuário: "quero a sidebar um pouco mais escura que o cinza do resto do site".
        background: 'var(--color-bg-sidebar)',
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
            title="ChessCap"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0,
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              padding: '0 4px',
            }}
          >
            {/* Logo oficial do site (mesma imagem do favicon, `public/logo.png`) — substitui o
                ícone vetorial genérico que tinha aqui antes, a pedido direto do usuário. */}
            <img
              src="/logo.png"
              alt=""
              width={27}
              height={27}
              style={{ borderRadius: 6, flexShrink: 0, display: 'block' }}
            />
            <span className="cl-display" style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--color-text-on-dark)', whiteSpace: 'nowrap' }}>ChessCap</span>
          </button>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Encolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Encolher menu'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 29, height: 29, flexShrink: 0, padding: 0,
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-gray-border)',
            background: 'var(--color-bg-raised)', color: 'var(--color-text-on-dark)', cursor: 'pointer',
            transition: 'background-color var(--dur-tap) var(--ease-tap), border-color var(--dur-tap) var(--ease-tap)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-blue-bright)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-border)' }}
        >
          <ChevronIcon width={17} height={17} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-enter) var(--ease-snap)' }} />
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--color-gray-border)', marginBottom: 18 }} />

      {/* Seção própria, acima de "Treino" — item novo de maior destaque (Sprint 4): jogar uma
          partida real contra o Stockfish com força limitada, não um exercício com resposta
          certa fixa como os treinos abaixo. Ícone genérico de peão (não a mascote) — o avatar da
          capivara já aparece dentro da própria tela de jogo, por faixa de força. */}
      <NavSection label="Jogar" collapsed={collapsed}>
        <NavItem icon={<PlayBotNavIcon width={22} height={22} />} label="Jogar contra a Capivara" active={playBotActive} onClick={onTogglePlayBot} collapsed={collapsed} />
      </NavSection>

      <NavSection label="Treino" collapsed={collapsed}>
        <NavItem icon={<TargetIcon width={22} height={22} />} label="Puzzles" active={trainingActive} onClick={onToggleTraining} collapsed={collapsed} />
        <NavItem icon={<BookNavIcon width={22} height={22} />} label="Treino de Aberturas" active={openingTrainingActive} onClick={onToggleOpeningTraining} collapsed={collapsed} />
        <NavItem icon={<ErrorTrainNavIcon width={22} height={22} />} label="Treino de Erros" active={errorTrainingActive} onClick={onToggleErrorTraining} collapsed={collapsed} />
        <NavItem icon={<EndgameNavIcon width={22} height={22} />} label="Treino de Finais" active={endgameTrainingActive} onClick={onToggleEndgameTraining} collapsed={collapsed} />
        {TRAIN_PLACEHOLDERS.map((label) => (
          <NavItem key={label} icon={<WrenchIcon width={21} height={21} />} label={label} collapsed={collapsed} soon
            onClick={() => onMaintenanceClick(label)} />
        ))}
      </NavSection>

      {/* Seção própria (não dentro de "Treino") — é o item-âncora do print que a pessoa
          compartilha (ver ROADMAP.md, Sprint 3), merece destaque visual separado. */}
      <NavSection label="Relatório" collapsed={collapsed}>
        <NavItem icon={<ReportNavIcon width={22} height={22} />} label="Relatório do Jogador" active={reportActive} onClick={onToggleReport} collapsed={collapsed} />
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
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--color-gray-muted)', whiteSpace: 'nowrap', flex: 1,
            }}>
              Ferramentas
            </span>
            <ChevronIcon width={12} height={12} style={{
              color: 'var(--color-gray-muted)', transform: toolsOpen ? 'rotate(-90deg)' : 'rotate(-180deg)',
              transition: 'transform var(--dur-tap) var(--ease-tap)', flexShrink: 0,
            }} />
          </button>
        )}
        {(collapsed || toolsOpen) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <NavItem icon={<AnalyzeNavIcon width={22} height={22} />} label="Analisar" active={searchActive} onClick={onAnalyzeClick} collapsed={collapsed} />
            <NavItem icon={<BoardNavIcon width={22} height={22} />} label="Tabuleiro" active={boardActive} onClick={onToggleBoard} collapsed={collapsed} />
            <NavItem icon={<PositionSetupIcon width={22} height={22} />} label="Definir Posição" active={positionEditorActive} onClick={onTogglePositionEditor} collapsed={collapsed} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <NavItem icon={<SunNavIcon width={22} height={22} />} label="Atualizações" onClick={onUpdates} collapsed={collapsed} />
        <NavItem icon={<GearIcon width={22} height={22} />} label="Configurações" onClick={onSettings} collapsed={collapsed} />
      </div>
    </nav>
  )
}

function NavSection({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 16 }}>
      {!collapsed && (
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-gray-muted)', padding: '0 6px', marginBottom: 6, whiteSpace: 'nowrap',
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
        justifyContent: collapsed ? 'center' : 'flex-start', gap: 11, width: '100%',
        padding: collapsed ? '12px 0' : '12px 13px', fontSize: soon ? 12.5 : 13.5, letterSpacing: '0.3px',
        opacity: soon ? 0.55 : 1,
      }}
    >
      {icon}
      {!collapsed && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {soon && (
            <span style={{
              marginLeft: 'auto', fontSize: 9, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase',
              padding: '2px 5px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
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
