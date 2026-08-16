import { ChesscomMarkIcon, LichessMarkIcon } from '../PlatformIcons'
import type { Platform } from '../PlayerSearch/PlayerSearch'
import type { SVGProps } from 'react'

interface HomePageProps {
  onOpenSearch: (platform: Platform) => void
}

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
 * Tela inicial — dividida em seções empilhadas (hero de busca, recursos, rodapé) em vez de um
 * card único monolítico, pra dar espaço fácil pra novas seções entrarem no futuro (ex: partidas
 * recentes, estatísticas) sem precisar redesenhar tudo. Rola internamente, como o resto do app.
 */
export function HomePage({ onOpenSearch }: HomePageProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)' }}>
      <div
        className="cl-fade-in"
        style={{
          maxWidth: 1080, margin: '0 auto',
          display: 'flex', flexDirection: 'column', gap: 44,
          padding: 'clamp(16px, 3vw, 32px) clamp(8px, 2vw, 16px) 40px',
        }}
      >
        {/* ── Hero: busca de jogador ── */}
        <div
          className="cl-home-hero"
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-gray-border)',
            background: 'var(--color-bg-panel)',
            overflow: 'hidden',
          }}
        >
          {/* Coluna da mascote */}
          <div
            aria-hidden
            className="cl-home-hero-image"
            style={{
              backgroundImage: 'url(/hero-capybara.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'left center',
              borderRight: '1px solid var(--color-gray-border)',
              position: 'relative',
            }}
          >
            <div aria-hidden style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 32%, transparent 78%, rgba(0,0,0,0.25) 100%)',
            }} />
          </div>

          {/* Coluna de conteúdo */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: 24,
            padding: 'clamp(28px, 4vw, 44px) clamp(24px, 4vw, 48px)', minWidth: 0,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, background: 'var(--color-blue-bright)' }} />
                <span style={{
                  fontSize: 11.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--color-blue-bright)',
                }}>
                  Analisador de xadrez
                </span>
              </div>
              <h1 className="cl-display" style={{
                fontSize: 'clamp(34px, 4.4vw, 48px)', fontWeight: 800, lineHeight: 1.05,
                letterSpacing: '-0.02em', color: 'var(--color-text-on-dark)',
              }}>
                Chess<span style={{ color: 'var(--color-blue-bright)' }}>Lens</span>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--color-gray-muted)', lineHeight: 1.6, maxWidth: 480 }}>
                Analise qualquer partida do <strong style={{ color: 'var(--color-text-on-dark)', fontWeight: 700 }}>chess.com</strong> ou do{' '}
                <strong style={{ color: 'var(--color-text-on-dark)', fontWeight: 700 }}>Lichess</strong> com o Stockfish completo —
                precisão, classificação lance a lance e gráfico de avaliação, tudo no seu navegador.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-gray-muted)' }}>
                Buscar jogador
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <PlatformCard
                  label="Chess.com"
                  description="Buscar partidas recentes"
                  Icon={ChesscomMarkIcon}
                  onClick={() => onOpenSearch('chesscom')}
                />
                <PlatformCard
                  label="Lichess"
                  description="Buscar partidas recentes"
                  Icon={LichessMarkIcon}
                  onClick={() => onOpenSearch('lichess')}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.5 }}>
                Busque um jogador e escolha "Analisar" numa das partidas recentes.
              </p>
            </div>
          </div>
        </div>

        {/* ── Recursos ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, background: 'var(--color-blue-bright)' }} />
            <h2 style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-gray-muted)' }}>
              O que você tem aqui
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {FEATURES.map(({ Icon, label, description }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: '16px 18px', borderRadius: 12,
                background: 'var(--color-bg-panel)',
                border: '1px solid var(--color-gray-border)',
              }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: 'var(--color-bg-panel)', color: 'var(--color-blue-bright)',
                }}>
                  <Icon />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.3 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.45 }}>{description}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Rodapé ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '18px 0 4px', borderTop: '1.5px solid var(--color-gray-border)',
        }}>
          <img src="/stockfish-logo.webp" alt="Stockfish" width={18} height={18} style={{ borderRadius: 5 }} />
          <span style={{ fontSize: 11.5, color: 'var(--color-gray-muted)' }}>
            Powered by <strong style={{ color: 'var(--color-text-on-dark)', fontWeight: 700 }}>Stockfish</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

function PlatformCard({
  label, description, Icon, onClick,
}: {
  label: string
  description: string
  Icon: typeof ChesscomMarkIcon
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="cl-btn"
      style={{
        justifyContent: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        width: '100%',
      }}
    >
      <Icon width={26} height={26} style={{ flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gray-muted)' }}>{description}</span>
      </span>
      <ArrowRightIcon style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--color-gray-muted)' }} />
    </button>
  )
}
