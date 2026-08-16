import { ChesscomMarkIcon, LichessMarkIcon } from '../PlatformIcons'
import type { Platform } from '../PlayerSearch/PlayerSearch'
import type { SVGProps } from 'react'

interface HomePageProps {
  onOpenSearch: (platform: Platform) => void
}

// ── PRA DESCER/SUBIR A IMAGEM DE FUNDO: mexe só nesse número aqui. ──────────────────────────
//    A janela de fundo (`.cl-hero-bg` em index.css) sempre cobre a altura inteira da página
//    (hero + recursos + rodapé) com `background-size: cover` — sem cortar as laterais, sem
//    sobrar vão nem faltar embaixo. HERO_BG_POSITION_Y escolhe qual fatia VERTICAL da imagem
//    aparece dentro dessa janela:
//      0   → mostra o TOPO da imagem (a capivara "desce"/sai mais de baixo do enquadramento)
//      100 → mostra o FUNDO da imagem (a capivara "sobe"/sai mais de cima do enquadramento)
//    Valor atual = 20 (mostra bem perto do topo da arte). Pra descer a capivara na tela,
//    AUMENTE esse número (experimente 40, 60...). Pra subir, diminua (0 já é o mínimo).
const HERO_BG_POSITION_Y = 40

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
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)' }}>
      {/* Wrapper com altura = altura do conteúdo (hero + recursos + rodapé). Os cards de Recurso
          não têm mais fundo opaco: ficam "flutuando" com vidro fosco (fundo translúcido + blur
          só onde o card ocupa), então a imagem de fundo continua visível por baixo deles em vez
          de sumir atrás de um retângulo sólido. Reenquadramento da imagem: ver as constantes
          HERO_BG_* logo acima do componente e as regras de `.cl-hero-bg` em index.css. */}
      <div style={{ position: 'relative', minHeight: '100%' }}>
        <div
          aria-hidden
          className="cl-hero-bg"
          style={{
            // "Colada no chão": presa no FUNDO (bottom:0), não no topo — nunca sobra vão embaixo.
            // Altura menor que a página inteira de propósito: com a caixa muito alta (quase um
            // retrato), `cover` passa a escalar pela ALTURA e a posição vertical
            // (HERO_BG_POSITION_Y) deixa de ter qualquer efeito — com essa altura mais baixa o
            // `cover` volta a escalar pela LARGURA, que é o que dá folga pra esse controle
            // realmente mover a imagem pra cima/baixo. O wrapper acima tem `minHeight:'100%'`
            // pra esticar até o fundo de verdade da tela (senão sobra um vão preto embaixo, já
            // que o container da página estica pra preencher a viewport mesmo com conteúdo curto).
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 540,
            ...({ '--hero-bg-pos-y': `${HERO_BG_POSITION_Y}%` } as React.CSSProperties),
          }}
        />

        <div className="cl-fade-in" style={{ position: 'relative' }}>
        {/* ── Hero: título + busca flutuam direto sobre o plano de fundo acima, sem card. Essa
            linha usa a largura TOTAL da página (não o maxWidth:1080 do resto) só pra poder
            encostar o texto bem mais pra direita — encostado em cima/direita, longe da lupa
            que a capivara segura no meio da imagem — e com bastante espaço embaixo antes dos
            Recursos, pra imagem "respirar" no meio. ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', minHeight: 170, marginBottom: 130,
          padding: 'clamp(8px, 1.5vw, 14px) clamp(10px, 1.5vw, 18px) 0',
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
                <p style={{ fontSize: 12, color: 'var(--color-text-on-dark)', lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                  Busque um jogador e escolha "Analisar" numa das partidas recentes.
                </p>
              </div>
            </div>
        </div>
        </div>

        {/* ── Recursos + Rodapé — voltam a usar o maxWidth:1080 centralizado (igual ao resto do
            app), diferente da linha do hero acima. Recursos fica quase colado no rodapé (pouco
            espaço abaixo), deixando a imagem de fundo "respirar" livre no vão grande acima. ── */}
        <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '0 clamp(8px, 2vw, 16px) 40px' }}>
        <section style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, background: 'var(--color-blue-bright)' }} />
            <h2 className="cl-display" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-on-dark)', opacity: 0.85, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              O que você tem aqui
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {FEATURES.map(({ Icon, label, description }) => (
              <div key={label} className="cl-card" style={{
                display: 'flex', flexDirection: 'column', gap: 10,
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

        {/* ── Rodapé — bem colado nos cards de Recursos acima (pouca distância entre os dois) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 0 4px', borderTop: '1.5px solid var(--color-gray-border)',
        }}>
          <img src="/stockfish-logo.webp" alt="Stockfish" width={18} height={18} style={{ borderRadius: 5 }} />
          <span style={{ fontSize: 11.5, color: 'var(--color-text-on-dark)', opacity: 0.85, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
            Powered by <strong style={{ opacity: 1, fontWeight: 700 }}>Stockfish</strong>
          </span>
        </div>
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
