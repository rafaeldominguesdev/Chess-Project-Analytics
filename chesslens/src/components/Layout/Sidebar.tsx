import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronIcon, CloseIcon, ErrorTrainNavIcon, GearIcon, SunNavIcon, WrenchIcon } from './icons'

// Abaixo desta largura a sidebar sai do fluxo e vira menu-gaveta (ver `isMobile` abaixo) — mesmo
// breakpoint já usado em outros pontos de `index.css` pra "tela estreita", reaproveitado aqui em
// vez de inventar um novo número.
const MOBILE_BREAKPOINT = '(max-width: 760px)'

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
  /** Estado do menu-gaveta no celular — dono é `App.tsx` (a barra superior mobile que abre o
   *  menu vive lá, fora da sidebar, pra reservar espaço de verdade em vez de flutuar por cima
   *  do conteúdo). */
  mobileOpen: boolean
  onCloseMobile: () => void
}

const COLLAPSED_KEY = 'chesslens-sidebar-collapsed'
// Aumentado a pedido direto do usuário: "deixe maior a sidebar e os icones e texto esta
// apertado" — eram 254/60, ícones 19-20px e fonte 10-12px, ficando apertado visualmente.
const WIDTH_EXPANDED = 278
// Aumentado de novo (68→80) depois que os ícones de imagem (Treino/Ferramentas/Relatório, ver
// `icon-treino.png` etc.) subiram pra 36px — 68px só deixava ~48px de largura útil (menos o
// padding da `<nav>`), quase sem folga ao redor de um ícone de 36px, ficando "espremido" contra
// as bordas do botão colapsado. Pedido direto do usuário: "quando sidebar diminuir dá uma
// aumentada na largura porque se não distorce o ícone".
const WIDTH_COLLAPSED = 80

// Estrutura de menu inspirada na sidebar do chessigma.com (Treino / Ferramentas), sem a parte
// comercial deles (preço, loja, blog) — não faz sentido num projeto pessoal. Lista enxuta, só o
// que tem chance real de virar funcionalidade — o resto dos itens do chessigma (Woodpecker,
// Blunder Shield, Sparring, Treino de Conversão, Próximo Lance, Calculadora de Elo) foi tirado.
const TRAIN_PLACEHOLDERS: string[] = []

/** Sidebar fixa à esquerda: marca e navegação principal. "Jogar" e "Relatório" continuam como
 *  item único (não vale a pena um submenu pra 1 item só). "Treino" e "Ferramentas" viraram
 *  `NavGroup` — um botão-gatilho que abre um flyout ao passar o mouse (ou focar via teclado),
 *  igual sidebar do chessigma — pedido direto do usuário depois de ver o menu antigo: "aí tem um
 *  ícone no Treino, aí quando passar mouse em cima fica assim [as opções]". Antes "Treino" era só
 *  uma lista fixa e "Ferramentas" era uma pasta que abria/fechava por clique (estado persistido);
 *  os dois agora usam o MESMO padrão de interação (consistência entre os dois grupos de múltiplos
 *  itens — ver decisão documentada em `NavGroup`), então o antigo `toolsOpen`/localStorage de
 *  "Ferramentas" saiu. Pode encolher a sidebar inteira pra só ícones (like ChatGPT) — o botão fica
 *  colado no topo, ao lado da marca — e esse estado persiste entre sessões (localStorage), já que
 *  é preferência de layout, não algo que muda por partida. Rola internamente (overflowY) porque
 *  com tudo expandido não cabe numa tela baixa. */
export function Sidebar({ onSettings, onUpdates, onToggleTraining, onToggleBoard, onToggleOpeningTraining, onToggleErrorTraining, onToggleEndgameTraining, onToggleReport, onTogglePlayBot, onGoHome, onAnalyzeClick, onMaintenanceClick, onTogglePositionEditor, trainingActive, boardActive, openingTrainingActive, errorTrainingActive, endgameTrainingActive, reportActive, playBotActive, positionEditorActive, searchActive, mobileOpen, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    // Sem preferência salva ainda: começa colapsada (só ícones) em telas estreitas, senão a
    // sidebar expandida sozinha já ocupa a maior parte de uma tela de celular.
    return saved !== null ? saved === '1' : window.innerWidth < 640
  })

  // Abaixo de `MOBILE_BREAKPOINT` a sidebar deixa de ser sticky-in-flow e vira menu-gaveta
  // (`position: fixed`, entra/sai por transform, coberta por overlay) — ver JSX abaixo. Rastreado
  // via `matchMedia` (não só `window.innerWidth` no mount) pra reagir a rotação de tela/resize.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_BREAKPOINT).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Girar a tela/redimensionar pra desktop com a gaveta aberta não deve deixar o overlay preso.
  useEffect(() => {
    if (!isMobile && mobileOpen) onCloseMobile()
  }, [isMobile, mobileOpen, onCloseMobile])

  // Esc fecha a gaveta, igual outros painéis do app.
  useEffect(() => {
    if (!mobileOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseMobile()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileOpen, onCloseMobile])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  // Na gaveta mobile sempre mostra a versão "expandida" (ícone + texto) — não faz sentido
  // colapsar pra só-ícone um menu que já começa escondido por padrão. O toggle de
  // colapsar/expandir (`collapsed`/`toggleCollapsed`) continua existindo só pro desktop.
  const effectiveCollapsed = isMobile ? false : collapsed

  // Todo onClick de item de navegação passa por aqui — fecha a gaveta mobile depois de navegar
  // (no desktop `onCloseMobile` é um no-op na prática, `mobileOpen` já começa falso). Sem isso,
  // cada item precisaria lembrar de fechar a gaveta na mão.
  function closeAnd(fn: () => void) {
    return () => { fn(); onCloseMobile() }
  }

  // Ícones dos sub-itens de Treino/Ferramentas — estilo "objeto 3D isolado" (chave inglesa,
  // peça de quebra-cabeça etc.), pedido direto do usuário depois de ver referências (não quis
  // que os ícones virassem a mascote, "quero cada ícone seja próprio"). `subIconStyle` deixa o
  // objeto renderizar um pouco maior que o SVG de traço fino que ele substitui (24px em vez de
  // 20px) — um render fotográfico "lê" pior muito pequeno do que um traço vetorial simples.
  const subIconStyle = { flexShrink: 0, display: 'block' as const, aspectRatio: '1' as const }
  const trainItems: GroupItem[] = [
    { icon: <img src="/icon-puzzles.png" alt="" width={24} height={24} style={subIconStyle} />, label: 'Puzzles', active: trainingActive, onClick: closeAnd(onToggleTraining) },
    { icon: <img src="/icon-aberturas.png" alt="" width={24} height={24} style={subIconStyle} />, label: 'Treino de Aberturas', active: openingTrainingActive, onClick: closeAnd(onToggleOpeningTraining) },
    { icon: <ErrorTrainNavIcon width={20} height={20} />, label: 'Treino de Erros', active: errorTrainingActive, onClick: closeAnd(onToggleErrorTraining) },
    { icon: <img src="/icon-finais.png" alt="" width={24} height={24} style={subIconStyle} />, label: 'Treino de Finais', active: endgameTrainingActive, onClick: closeAnd(onToggleEndgameTraining) },
    ...TRAIN_PLACEHOLDERS.map((label) => ({
      icon: <WrenchIcon width={19} height={19} />, label, active: false, soon: true,
      onClick: closeAnd(() => onMaintenanceClick(label)),
    })),
  ]

  const toolItems: GroupItem[] = [
    { icon: <img src="/icon-analisar.png" alt="" width={24} height={24} style={subIconStyle} />, label: 'Analisar', active: searchActive, onClick: closeAnd(onAnalyzeClick) },
    { icon: <img src="/icon-tabuleiro.png" alt="" width={24} height={24} style={subIconStyle} />, label: 'Tabuleiro', active: boardActive, onClick: closeAnd(onToggleBoard) },
    { icon: <img src="/icon-posicao.png" alt="" width={24} height={24} style={subIconStyle} />, label: 'Definir Posição', active: positionEditorActive, onClick: closeAnd(onTogglePositionEditor) },
  ]

  return (
    <>
      {/* Overlay escuro atrás da gaveta — só existe de fato <760px com a gaveta aberta (ver
          `isMobile`/`mobileOpen`); no desktop nunca renderiza. */}
      {isMobile && mobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 44 }}
        />
      )}
      <nav
        style={{
          width: isMobile ? WIDTH_EXPANDED : (collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED), flexShrink: 0,
          position: isMobile ? 'fixed' : 'sticky', top: 0, left: 0,
          height: '100vh',
          display: 'flex', flexDirection: 'column',
          padding: effectiveCollapsed ? '18px 10px' : '18px 14px',
          // Um tom mais escuro que o resto do app (--color-bg-panel), não o mesmo — pedido direto
          // do usuário: "quero a sidebar um pouco mais escura que o cinza do resto do site".
          background: 'var(--color-bg-sidebar)',
          borderRight: '1px solid var(--color-gray-border)',
          zIndex: isMobile ? 45 : 30,
          // <760px a sidebar entra/sai por transform (menu-gaveta) — "abre feito dobradiça",
          // por isso `--ease-hinge` em vez do `--ease-snap` usado na transição de largura do
          // desktop (ver skill de design: hinge é pra elementos que ABREM, não que aparecem).
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
          boxShadow: isMobile && mobileOpen ? '4px 0 24px rgba(0,0,0,0.45)' : undefined,
          transition: isMobile
            ? 'transform var(--dur-enter) var(--ease-hinge)'
            : 'width var(--dur-enter) var(--ease-snap), padding var(--dur-enter) var(--ease-snap)',
          overflowX: 'hidden', overflowY: 'auto',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18,
          // Colapsada, a marca e o botão de toggle não cabem lado a lado (60px de largura total,
          // menos padding, não sobra espaço pros dois) — empilha em duas linhas centralizadas.
          flexDirection: effectiveCollapsed ? 'column' : 'row',
        }}>
          {!effectiveCollapsed && (
            <button
              onClick={closeAnd(onGoHome)}
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
                width={34}
                height={34}
                style={{ borderRadius: 7, flexShrink: 0, display: 'block' }}
              />
              <span className="cl-display" style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text-on-dark)', whiteSpace: 'nowrap' }}>ChessCap</span>
            </button>
          )}
          <button
            onClick={isMobile ? onCloseMobile : toggleCollapsed}
            title={isMobile ? 'Fechar menu' : (collapsed ? 'Expandir menu' : 'Encolher menu')}
            aria-label={isMobile ? 'Fechar menu' : (collapsed ? 'Expandir menu' : 'Encolher menu')}
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
            {isMobile ? (
              <CloseIcon width={17} height={17} />
            ) : (
              <ChevronIcon width={17} height={17} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-enter) var(--ease-snap)' }} />
            )}
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-gray-border)', marginBottom: 18 }} />

        {/* Seção própria, acima de "Treino" — item novo de maior destaque (Sprint 4): jogar uma
            partida real contra o Stockfish com força limitada, não um exercício com resposta
            certa fixa como os treinos abaixo. Ícone genérico de peão (não a mascote) — o avatar da
            capivara já aparece dentro da própria tela de jogo, por faixa de força. Item único —
            continua `NavItem` simples, não vira `NavGroup` (um submenu pra 1 item só não faz sentido). */}
        <NavSection label="Jogar" collapsed={effectiveCollapsed}>
          <NavItem icon={<img src="/icon-jogar.png" alt="" width={44} height={44} style={{ flexShrink: 0, display: 'block', aspectRatio: '1' }} />} label="Jogar contra a Capivara" active={playBotActive} onClick={closeAnd(onTogglePlayBot)} collapsed={effectiveCollapsed} />
        </NavSection>

        <div style={{ marginBottom: 16 }}>
          <NavGroup icon={<img src="/icon-treino.png" alt="" width={36} height={36} style={{ flexShrink: 0, display: 'block', aspectRatio: '1' }} />} label="Treino" collapsed={effectiveCollapsed} items={trainItems} inline={isMobile} />
        </div>

        {/* Seção própria (não dentro de "Treino") — é o item-âncora do print que a pessoa
            compartilha (ver ROADMAP.md, Sprint 3), merece destaque visual separado. Item único —
            mesmo raciocínio de "Jogar" acima. */}
        <NavSection label="Relatório" collapsed={effectiveCollapsed}>
          <NavItem icon={<img src="/icon-relatorio.png" alt="" width={36} height={36} style={{ flexShrink: 0, display: 'block', aspectRatio: '1' }} />} label="Relatório do Jogador" active={reportActive} onClick={closeAnd(onToggleReport)} collapsed={effectiveCollapsed} />
        </NavSection>

        <div style={{ marginBottom: 16 }}>
          <NavGroup icon={<img src="/icon-ferramentas.png" alt="" width={36} height={36} style={{ flexShrink: 0, display: 'block', aspectRatio: '1' }} />} label="Ferramentas" collapsed={effectiveCollapsed} items={toolItems} inline={isMobile} />
        </div>

        <div style={{ flex: 1, minHeight: 12 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <NavItem icon={<SunNavIcon width={22} height={22} />} label="Atualizações" onClick={closeAnd(onUpdates)} collapsed={effectiveCollapsed} />
          <NavItem icon={<GearIcon width={22} height={22} />} label="Configurações" onClick={closeAnd(onSettings)} collapsed={effectiveCollapsed} />
        </div>
      </nav>
    </>
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

interface GroupItem {
  icon: ReactNode
  label: string
  active: boolean
  soon?: boolean
  onClick: () => void
}

const FLYOUT_CLOSE_DELAY_MS = 220

/** Botão-gatilho de um grupo com múltiplos itens ("Treino", "Ferramentas") — abre um flyout ao
 *  lado (não embaixo, não é acordeão) ao passar o mouse ou focar via teclado, igual sidebar do
 *  chessigma. Decisão de aplicar o MESMO padrão aos dois grupos (não só "Treino", que foi o
 *  pedido original): "Ferramentas" antes era uma pasta que abria/fechava por clique dentro do
 *  próprio fluxo da sidebar — ter um grupo em hover-flyout e outro em clique-acordeão lado a lado
 *  ficaria inconsistente (mesma forma visual de botão, dois comportamentos diferentes), então os
 *  dois grupos de múltiplos itens migraram juntos.
 *
 *  Posicionamento: `position: fixed` calculado a partir do `getBoundingClientRect()` do próprio
 *  botão (não `position: absolute` dentro da sidebar) — a `<nav>` tem `overflow-x: hidden` (evita
 *  scrollbar horizontal durante a transição de largura colapsar/expandir), que cortaria um flyout
 *  posicionado `absolute` saindo pra fora da faixa da sidebar. Elemento `fixed` escapa do corte de
 *  `overflow: hidden` de um ancestral (desde que nenhum ancestral tenha `transform`/`filter` — não
 *  é o caso aqui), então o painel aparece por cima de tudo sem precisar de portal.
 *  Isso também mantém a ordem do DOM igual à ordem visual (o flyout é filho do próprio grupo, não
 *  teleportado pro fim do `<body>`), o que ajuda a navegação por Tab a continuar previsível.
 *
 *  Teclado: Enter/Espaço no gatilho abre e mantém aberto; seta-baixo foca o 1º item; Esc fecha e
 *  devolve o foco pro gatilho. Não é uma implementação completa do padrão ARIA `menu` (roving
 *  tabindex, `menuitem` em cada linha) — pros itens continuarem funcionando como botões normais
 *  fora do flyout (reuso do mesmo `NavItem`), ficou uma versão simplificada; documentado aqui
 *  como limitação conhecida, não uma omissão. */
function NavGroup({ icon, label, collapsed, items, inline = false }: { icon: ReactNode; label: string; collapsed: boolean; items: GroupItem[]; inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | null>(null)

  const activeAny = items.some(i => i.active)

  function cancelClose() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function computePos() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.top, left: rect.right + 8 })
  }

  // Os dois hooks abaixo só fazem sentido no flyout desktop (posição/clique-fora), mas rodam
  // incondicionalmente pra manter a mesma contagem de hooks entre renders — `inline` pode mudar
  // em tempo real (redimensionar a janela cruzando o breakpoint mobile), e um `return` condicional
  // ANTES de um hook faria React acusar "Rendered fewer hooks than expected" nesse resize.
  useEffect(() => {
    if (inline || !open) return
    function handlePointerDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', computePos)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', computePos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, open])

  useEffect(() => () => cancelClose(), [])

  // Menu-gaveta mobile (`inline`): sem mouse, e a gaveta já ocupa a tela toda — o padrão de
  // flyout por hover/posição fixa do desktop (abaixo) não faz sentido aqui. Vira um acordeão
  // simples, os itens aparecem embutidos no próprio fluxo da gaveta, indentados sob o gatilho.
  if (inline) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          aria-haspopup="true"
          aria-expanded={open}
          className={`cl-btn cl-nav-btn${activeAny ? ' cl-btn-selected' : ''}`}
          style={{ justifyContent: 'flex-start', gap: 11, width: '100%', padding: '8px 13px', fontSize: 14.5, letterSpacing: 0 }}
        >
          {icon}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <span className="cl-display" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{label}</span>
            <ChevronIcon width={12} height={12} style={{ color: 'var(--color-gray-muted)', transform: open ? 'rotate(90deg)' : 'rotate(-90deg)', flexShrink: 0, opacity: 0.7, transition: 'transform var(--dur-tap) var(--ease-tap)' }} />
          </span>
        </button>
        {open && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, marginBottom: 4,
            paddingLeft: 10, marginLeft: 15, borderLeft: '1px solid var(--color-gray-border)',
          }}>
            {items.map((item) => (
              <NavItem key={item.label} icon={item.icon} label={item.label} active={item.active} collapsed={false} soon={item.soon} onClick={item.onClick} />
            ))}
          </div>
        )}
      </div>
    )
  }

  function openNow() {
    cancelClose()
    computePos()
    setOpen(true)
  }

  function scheduleClose() {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), FLYOUT_CLOSE_DELAY_MS)
  }

  return (
    <div ref={wrapperRef} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        onMouseEnter={openNow}
        onFocus={openNow}
        onClick={() => (open ? setOpen(false) : openNow())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); openNow() }
          if (e.key === 'Escape') setOpen(false)
        }}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        className={`cl-btn cl-nav-btn${activeAny ? ' cl-btn-selected' : ''}`}
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start', gap: 11, width: '100%',
          padding: collapsed ? '8px 0' : '8px 13px', fontSize: 14.5, letterSpacing: 0,
        }}
      >
        {icon}
        {!collapsed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <span className="cl-display" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{label}</span>
            {/* Indica "abre um submenu ao lado" — aponta pra direita (rotate 180 no `<` padrão),
                não pra baixo, porque o flyout nasce ao lado do botão, não embaixo dele. */}
            <ChevronIcon width={12} height={12} style={{ color: 'var(--color-gray-muted)', transform: 'rotate(180deg)', flexShrink: 0, opacity: 0.7 }} />
          </span>
        )}
      </button>

      {open && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
          }}
          className="cl-card cl-flyout-in"
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 100,
            minWidth: 232, padding: 6, display: 'flex', flexDirection: 'column', gap: 3,
          }}
        >
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--color-gray-muted)', padding: '4px 7px 6px', whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
          {items.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={item.active}
              collapsed={false}
              soon={item.soon}
              onClick={() => { item.onClick(); setOpen(false) }}
            />
          ))}
        </div>
      )}
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
      className={`cl-btn cl-nav-btn${active ? ' cl-btn-selected' : ''}`}
      style={{
        justifyContent: collapsed ? 'center' : 'flex-start', gap: 11, width: '100%',
        padding: collapsed ? '8px 0' : '8px 13px', fontSize: soon ? 13 : 14.5, letterSpacing: 0,
        opacity: soon ? 0.55 : 1,
      }}
    >
      {icon}
      {!collapsed && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <span className="cl-display" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
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
