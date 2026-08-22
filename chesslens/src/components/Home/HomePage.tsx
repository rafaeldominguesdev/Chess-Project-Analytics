import { useEffect, useRef, useState } from 'react'
import type { SVGProps } from 'react'
import { ChesscomMarkIcon, LichessMarkIcon } from '../PlatformIcons'
import { usePlayerSearch } from '../../hooks/usePlayerSearch'
import { useRecentGames } from '../../hooks/useRecentGames'
import { useLichessSearch } from '../../hooks/useLichessSearch'
import { useLichessRecentGames } from '../../hooks/useLichessRecentGames'
import { PlayerCard as SearchPlayerCard } from '../PlayerSearch/PlayerCard'
import { LichessPlayerCard } from '../PlayerSearch/LichessPlayerCard'
import { StatsGrid } from '../PlayerSearch/StatsGrid'
import { LichessStatsGrid } from '../PlayerSearch/LichessStatsGrid'
import { RecentGames } from '../PlayerSearch/RecentGames'

export type Platform = 'chesscom' | 'lichess'

const LAST_SEARCH_KEY = 'chesslens-last-player-search'
const LAST_PLATFORM_KEY = 'chesslens-last-platform'

const PLATFORM_META: Record<Platform, { label: string; placeholder: string; Icon: typeof ChesscomMarkIcon }> = {
  chesscom: { label: 'Chess.com', placeholder: 'Username do chess.com...', Icon: ChesscomMarkIcon },
  lichess: { label: 'Lichess', placeholder: 'Username do Lichess...', Icon: LichessMarkIcon },
}

interface HomePageProps {
  /** Chamado quando o usuário clica em "Analisar" numa partida recente — recebe o PGN completo. */
  onAnalyzeGame: (pgn: string) => void
}

// ── PRA DESCER/SUBIR A IMAGEM DE FUNDO: mexe só nesse número aqui. ──────────────────────────
//    A janela de fundo (`.cl-hero-bg` em index.css) cobre a altura inteira da página com
//    `background-size: 100% auto` — a arte tem tamanho FIXO (escala só pela largura, sem zoom,
//    sem cortar tabuleiro/capivara). HERO_BG_POSITION_Y decide o quanto ela desce:
//      0   → imagem colada no TOPO da janela (capivara sobe na tela)
//      100 → imagem colada no FUNDO da janela (capivara desce ao máximo)
//    Valor atual = 80. Pra descer mais, aumente (até 100). Pra subir, diminua.
const HERO_BG_POSITION_Y = 80

function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

function CpuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  )
}

function RibbonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="5.2" />
      <path d="M8.7 12.5 7 21l5-2.6L17 21l-1.7-8.5" />
    </svg>
  )
}

function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </svg>
  )
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ ...props, strokeWidth: 2.4 })}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const FEATURES = [
  { Icon: CpuIcon, label: 'Stockfish completo', description: 'Motor rodando 100% no seu navegador, sem servidor.' },
  { Icon: RibbonIcon, label: 'Classificação lance a lance', description: 'Brilhante, erro, imprecisão — pra cada jogada, igual chess.com.' },
  { Icon: BookIcon, label: 'Repertório de abertura', description: 'Nome real da abertura, linhas que você mais joga e onde foge da teoria.' },
]

/**
 * Tela inicial — também É a tela de "Analisar": a busca de jogador (abas de plataforma, campo de
 * username e resultado) fica embutida direto na página, em vez de abrir um modal separado por
 * cima de uma "home padrão". Uma página só, com o resultado da busca aparecendo entre o hero e
 * os cards de Recursos quando existe. Rola internamente, como o resto do app.
 */
export function HomePage({ onAnalyzeGame }: HomePageProps) {
  const [platform, setPlatform] = useState<Platform>(
    () => (localStorage.getItem(LAST_PLATFORM_KEY) as Platform | null) ?? 'chesscom',
  )
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const chesscom = usePlayerSearch()
  const lichess = useLichessSearch()
  const chesscomGames = useRecentGames(chesscom.profile?.username ?? null)
  const lichessGames = useLichessRecentGames(lichess.profile?.username ?? null)

  const active = platform === 'chesscom' ? chesscom : lichess
  const meta = PLATFORM_META[platform]

  // Restaura o último username buscado nessa plataforma sempre que ela fica ativa (inclusive no
  // primeiro render, já que a plataforma inicial vem do localStorage).
  useEffect(() => {
    const saved = localStorage.getItem(`${LAST_SEARCH_KEY}-${platform}`)
    if (saved && !active.profile) {
      setInput(saved)
      active.search(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform])

  function runSearch() {
    const trimmed = input.trim()
    if (!trimmed) return
    active.search(trimmed)
    localStorage.setItem(`${LAST_SEARCH_KEY}-${platform}`, trimmed)
    localStorage.setItem(LAST_PLATFORM_KEY, platform)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSearch()
  }

  function switchPlatform(p: Platform) {
    if (p === platform) return
    setPlatform(p)
    setInput('')
    localStorage.setItem(LAST_PLATFORM_KEY, p)
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  const showResults = active.loading || !!active.error || !!active.profile

  return (
    <div style={{ flex: 1, minWidth: 0, overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 20px)' }}>
      {/* Wrapper com altura = altura do conteúdo (hero + resultado + recursos + rodapé). Os cards
          de Recurso não têm mais fundo opaco: ficam "flutuando" com vidro fosco (fundo translúcido
          + blur só onde o card ocupa), então a imagem de fundo continua visível por baixo deles em
          vez de sumir atrás de um retângulo sólido. Reenquadramento da imagem: ver as constantes
          HERO_BG_* logo acima do componente e as regras de `.cl-hero-bg` em index.css. */}
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <div
          aria-hidden
          className="cl-hero-bg"
          style={{
            // Cobre a tela toda: o wrapper acima tem minHeight quase igual à altura visível, e
            // essa camada preenche esse wrapper de ponta a ponta (inset:0, sem hack de `top` em
            // pixel — empurrar com `top` encolhe a altura da caixa e muda a proporção dela, o
            // que faz o `cover` (em index.css) trocar de eixo de corte e cortar a PRÓPRIA arte
            // (tabuleiro/patas) em vez de só a lateral. Em vez disso, o tamanho da imagem agora é
            // fixo (`background-size: 100% auto` no CSS), então empurrar pra baixo/cima é só
            // HERO_BG_POSITION_Y, sem risco de cortar a cena).
            position: 'absolute', inset: 0,
            ...({ '--hero-bg-pos-y': `${HERO_BG_POSITION_Y}%` } as React.CSSProperties),
          }}
        />
        {/* Fumaça do rodapé — névoa âmbar subindo do fim da página, só decorativa (aria-hidden). */}
        <div aria-hidden className="cl-footer-fog" />

        <div className="cl-fade-in" style={{ position: 'relative' }}>
        {/* ── Hero: título + busca flutuam direto sobre o plano de fundo acima, sem card. Essa
            linha usa a largura TOTAL da página (não o maxWidth:1080 do resto) só pra poder
            encostar o texto bem mais pra direita — encostado em cima/direita, longe da lupa
            que a capivara segura no meio da imagem — e com bastante espaço embaixo antes do
            resultado da busca (ou dos Recursos, se não houver busca ainda), pra imagem
            "respirar" no meio. ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', minHeight: 170, marginBottom: 130,
          padding: 'clamp(28px, 4vw, 44px) clamp(40px, 6vw, 72px) 0',
        }}>
            <div className="cl-home-hero-content" style={{ flex: '0 1 380px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-start', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, background: 'var(--color-blue-bright)' }} />
                  <span style={{
                    fontSize: 11.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--color-blue-bright)', textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                  }}>
                    Analisador de xadrez
                  </span>
                </div>
                <h1 className="cl-display" style={{
                  fontSize: 'clamp(28px, 3.4vw, 38px)', fontWeight: 800, lineHeight: 1.05,
                  letterSpacing: '-0.02em', color: 'var(--color-text-on-dark)',
                  textShadow: '0 2px 16px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
                }}>
                  Chess<span style={{ color: 'var(--color-blue-bright)' }}>Lens</span>
                </h1>
                <p style={{
                  fontSize: 15, color: 'var(--color-text-on-dark)', lineHeight: 1.6,
                  textShadow: '0 1px 8px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.95)',
                }}>
                  Analise qualquer partida do <strong style={{ fontWeight: 700 }}>chess.com</strong> ou do{' '}
                  <strong style={{ fontWeight: 700 }}>Lichess</strong> com o Stockfish completo —
                  precisão, classificação lance a lance e gráfico de avaliação, tudo no seu navegador.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-on-dark)', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                  Buscar jogador
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <PlatformTab
                    label="Chess.com"
                    description="Buscar partidas recentes"
                    Icon={ChesscomMarkIcon}
                    active={platform === 'chesscom'}
                    onClick={() => switchPlatform('chesscom')}
                  />
                  <PlatformTab
                    label="Lichess"
                    description="Buscar partidas recentes"
                    Icon={LichessMarkIcon}
                    active={platform === 'lichess'}
                    onClick={() => switchPlatform('lichess')}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={meta.placeholder}
                    aria-label={`Buscar jogador no ${meta.label}`}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      fontSize: 14,
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-gray-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-on-light)',
                      outline: 'none',
                      boxShadow: 'inset 0 2px 4px 0 rgba(28,25,22,0.18), inset 0 1px 0 0 rgba(28,25,22,0.1)',
                    }}
                  />
                  <button
                    onClick={runSearch}
                    className="cl-btn cl-btn-accent"
                    style={{ padding: '11px 20px', fontSize: 14, flexShrink: 0 }}
                  >
                    Buscar
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-on-dark)', lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                  Escolha a plataforma, busque um jogador e escolha "Analisar" numa das partidas recentes.
                </p>
              </div>
            </div>
        </div>
        </div>

        {/* ── Resultado da busca, Recursos e Rodapé — encostados na ESQUERDA (não mais
            centralizados) e empurrados pro FUNDO da página (`marginTop:'auto'` no wrapper
            flex-column acima empurra esse bloco até a base, com o vão grande acima deixando a
            imagem de fundo "respirar"). ── */}
        <div style={{ position: 'relative', maxWidth: 1080, marginTop: 'auto', padding: '0 clamp(8px, 2vw, 16px) 40px' }}>

        {showResults && (
          <section style={{ marginBottom: 28 }} key={platform}>
            <SectionHeader>Resultado da busca</SectionHeader>

            {active.loading && <SearchLoadingSkeleton />}

            {!active.loading && active.error && (
              <div className="cl-card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '40px 16px', textAlign: 'center',
              }}>
                <span style={{ fontSize: 32 }}>😕</span>
                <span style={{ fontSize: 14.5, color: 'var(--color-text-on-dark)', fontWeight: 700 }}>{active.error}</span>
                <span style={{ fontSize: 12.5, color: 'var(--color-gray-muted)' }}>Verifique o username e tente novamente.</span>
              </div>
            )}

            {!active.loading && !active.error && platform === 'chesscom' && chesscom.profile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} key={chesscom.profile.username}>
                <SearchPlayerCard profile={chesscom.profile} />
                {chesscom.stats && <StatsGrid stats={chesscom.stats} />}
                <RecentGames games={chesscomGames.games} loading={chesscomGames.loading} onAnalyze={onAnalyzeGame} />
              </div>
            )}

            {!active.loading && !active.error && platform === 'lichess' && lichess.profile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} key={lichess.profile.username}>
                <LichessPlayerCard profile={lichess.profile} totalGames={lichess.stats?.totalGames} />
                {lichess.stats && <LichessStatsGrid stats={lichess.stats} />}
                <RecentGames games={lichessGames.games} loading={lichessGames.loading} onAnalyze={onAnalyzeGame} />
              </div>
            )}
          </section>
        )}

        <section style={{ marginBottom: 4 }}>
          <SectionHeader>O que você tem aqui</SectionHeader>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 14 }}>
            {FEATURES.map(({ Icon, label, description }) => (
              <div key={label} className="cl-card cl-feature-card" style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                flex: '0 0 250px',
                padding: '16px 18px',
                // Vidro fosco — fundo translúcido + blur só na área do card, em vez de opaco,
                // pra imagem de fundo continuar visível por baixo (ver wrapper com o plano de
                // fundo mais acima, que agora cobre a altura da página inteira).
                background: 'color-mix(in srgb, var(--color-bg-panel) 55%, transparent)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: 'color-mix(in srgb, var(--color-bg-main) 55%, transparent)', color: 'var(--color-blue-bright)',
                }}>
                  <Icon />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.3, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-on-dark)', opacity: 0.85, lineHeight: 1.45, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{description}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        </div>
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, background: 'var(--color-blue-bright)' }} />
      <h2 className="cl-display" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-on-dark)', opacity: 0.85, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
        {children}
      </h2>
    </div>
  )
}

function SearchLoadingSkeleton() {
  const shimmer: React.CSSProperties = {
    background: 'var(--color-bg-panel)',
    borderRadius: 'var(--radius-sm)',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ ...shimmer, width: 96, height: 96, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...shimmer, width: 180, height: 20 }} />
          <div style={{ ...shimmer, width: 120, height: 12 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...shimmer, height: 100, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...shimmer, height: 56, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  )
}

function PlatformTab({
  label, description, Icon, active, onClick,
}: {
  label: string
  description: string
  Icon: typeof ChesscomMarkIcon
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="cl-btn"
      style={{
        justifyContent: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        width: '100%',
        borderColor: active ? 'var(--color-blue-bright)' : undefined,
      }}
    >
      <Icon width={26} height={26} style={{ flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gray-muted)' }}>{description}</span>
      </span>
      <ArrowRightIcon style={{ marginLeft: 'auto', flexShrink: 0, color: active ? 'var(--color-blue-bright)' : 'var(--color-gray-muted)' }} />
    </button>
  )
}
