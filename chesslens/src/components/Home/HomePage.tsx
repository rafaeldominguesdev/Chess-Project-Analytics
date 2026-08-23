import type { SVGProps } from 'react'
import { ChesscomMarkIcon, LichessMarkIcon } from '../PlatformIcons'
import type { Platform } from '../PlayerSearch/SearchView'

interface HomePageProps {
  onOpenSearch: (platform: Platform) => void
}

// ── PRA DESCER/SUBIR A IMAGEM DE FUNDO: mexe só nesse número aqui. ──────────────────────────
//    A janela de fundo (`.cl-hero-bg` em index.css) cobre a altura inteira da página com
//    `background-size: cover` — a arte preenche a caixa nos 4 lados sempre, sem vão. Quando a
//    caixa é mais alta que a proporção 16:9 da arte, sobra corte vertical; HERO_BG_POSITION_Y
//    decide de qual lado esse corte sai:
//      0   → corta embaixo (risco: tabuleiro, que quase encosta na borda inferior da arte)
//      100 → corta em cima (seguro: só a faixa preta vazia acima da cabeça da capivara)
//    Valor atual = 90 → âncora quase no fundo, corte sai quase todo de cima. Não baixar muito
//    (a folga acima da cabeça acaba perto de ~85-90; abaixo disso o corte pode chegar nas
//    orelhas). Pra descer a imagem mais, aumente (até 100). Pra subir, diminua com cautela.
const HERO_BG_POSITION_Y = 90

function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
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

// Card "Stockfish completo" usa o logo OFICIAL do próprio motor Stockfish (não o logo do site —
// pedido direto do usuário depois de corrigir minha primeira tentativa, que tinha colocado o logo
// do ChessLens ali por engano). Baixado direto de stockfishchess.org/images/logo/icon_512x512.png
// (o link oficial referenciado no próprio README do projeto no GitHub, official-stockfish/
// Stockfish) — peixe sobre tabuleiro quadriculado, a mascote/marca real do motor. É o único card
// com `image` em vez de `Icon` (os outros dois continuam com SVG próprio); o card renderiza um
// dos dois, nunca os dois juntos.
const FEATURES: { Icon?: typeof RibbonIcon; image?: string; label: string; description: string }[] = [
  { image: '/stockfish-logo.png', label: 'Stockfish completo', description: 'Motor rodando 100% no seu navegador, sem servidor.' },
  { Icon: RibbonIcon, label: 'Classificação lance a lance', description: 'Brilhante, erro, imprecisão — pra cada jogada, igual chess.com.' },
  { Icon: BookIcon, label: 'Repertório de abertura', description: 'Nome real da abertura, linhas que você mais joga e onde foge da teoria.' },
]

/**
 * Tela inicial — só a vitrine: capivara em tela cheia, título, os dois cards de plataforma
 * (Chess.com/Lichess) e os cards de Recursos. Não busca nada aqui — clicar num card de
 * plataforma leva pra a tela de "Analisar" (`SearchView`), que é uma página separada, sem a
 * imagem de fundo, dedicada à busca em si. Rola internamente, como o resto do app.
 */
export function HomePage({ onOpenSearch }: HomePageProps) {
  return (
    // `background:'#000'` aqui, não só em `.cl-home-hero-wrap` logo abaixo: esse `<div>` é o
    // container de ROLAGEM da Home inteira (`maxHeight: calc(100vh - 20px)`), e `.cl-home-hero-
    // wrap` só tem uma altura MÍNIMA (`minHeight`, um piso, não um "esticar até preencher") — em
    // telas altas o conteúdo (hero + cards) pode ficar mais curto que o espaço disponível aqui,
    // sobrando uma faixa cinza (herdada de `body`/--color-bg-main) embaixo do wrap preto. Achado
    // pelo usuário direto no DOM depois do fix anterior (que só cobriu o wrap, não este pai).
    <div style={{ flex: 1, minWidth: 0, overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', background: '#000000' }}>
      {/* Wrapper com altura = altura do conteúdo (hero + recursos + rodapé). Os cards de Recurso
          não têm mais fundo opaco: ficam "flutuando" com vidro fosco (fundo translúcido + blur
          só onde o card ocupa), então a imagem de fundo continua visível por baixo deles em vez
          de sumir atrás de um retângulo sólido. Reenquadramento da imagem: ver as constantes
          HERO_BG_* logo acima do componente e as regras de `.cl-hero-bg` em index.css.
          `containerType: 'inline-size'` transforma este wrapper num container de consulta CSS —
          é o que permite `.cl-hero-bg` (abaixo) medir a própria LARGURA via `cqw` e calcular a
          própria altura na proporção 16:9 da arte, em vez de esticar pela altura do wrapper
          (que pode ser bem mais alta que 16:9 — conteúdo empilhado: hero + cards + rodapé). */}
      <div className="cl-home-hero-wrap" style={{ position: 'relative', minHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <div
          aria-hidden
          className="cl-hero-bg"
          style={{
            // Faixa do topo do wrapper, não o wrapper inteiro: `top`/`left`/`right` fixam a
            // largura (100% do container), e a ALTURA vem de `.cl-hero-bg` em index.css
            // (`height: calc(56.25cqw + 12px)`, ou seja: largura × 9/16, a proporção nativa da
            // arte, mais uma folga de respiração). Isso mantém essa caixa sempre PRÓXIMA da
            // proporção 16:9 da própria imagem, não importa o quão alto o wrapper fique (o
            // conteúdo abaixo — cards de Recurso, rodapé — continua sobre a cor de fundo normal,
            // não precisa de imagem atrás). Com a caixa já quase 16:9, `background-size: cover`
            // (index.css) não precisa cortar quase nada — é o que garante capivara E tabuleiro
            // sempre visíveis inteiros, em qualquer largura de janela. `top: -6px` (a caixa é
            // 12px mais alta que a largura×9/16 pura) dá folga pra `cl-hero-breathe` (respiração,
            // translateY ±5px em index.css) sem revelar a cor de fundo por trás no topo da
            // página. `background-position` (18%/... x, HERO_BG_POSITION_Y y, em index.css) ainda
            // existe como ajuste fino pro pouco corte residual, mas não é mais o que evita cortar
            // capivara/tabuleiro — isso agora é a proporção da caixa em si.
            position: 'absolute', top: -6, right: 0, left: 0,
            ...({ '--hero-bg-pos-y': `${HERO_BG_POSITION_Y}%` } as React.CSSProperties),
          }}
        />
        {/* Fumaça do rodapé — névoa âmbar subindo do fim da página, só decorativa (aria-hidden). */}
        <div aria-hidden className="cl-footer-fog" />

        <div className="cl-fade-in" style={{ position: 'relative' }}>
        {/* ── Hero: título + busca flutuam direto sobre o plano de fundo acima, sem card. Essa
            linha usa a largura TOTAL da página (não o maxWidth:1080 do resto) só pra poder
            encostar o texto bem mais pra direita — encostado em cima/direita, longe da lupa
            que a capivara segura no meio da imagem — e com bastante espaço embaixo antes dos
            Recursos, pra imagem "respirar" no meio. ── */}
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

        {/* ── Recursos + Rodapé — encostados na ESQUERDA (não mais centralizados) e empurrados
            pro FUNDO da página (`marginTop:'auto'` no wrapper flex-column acima empurra esse
            bloco até a base, com o vão grande acima deixando a imagem de fundo "respirar"). ── */}
        <div style={{ position: 'relative', maxWidth: 1080, marginTop: 'auto', padding: '0 clamp(8px, 2vw, 16px) 40px' }}>
        <section style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, background: 'var(--color-blue-bright)' }} />
            <h2 className="cl-display" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-on-dark)', opacity: 0.85, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              O que você tem aqui
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 14 }}>
            {FEATURES.map(({ Icon, image, label, description }) => (
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
                  overflow: 'hidden',
                  // O card "Stockfish completo" usa o logo oficial (imagem, já tem fundo/cantos
                  // próprios) em vez de um ícone de traço — sem o fundo/cor tintados dos outros,
                  // que ficariam duplicados atrás de uma imagem opaca.
                  background: image ? 'transparent' : 'color-mix(in srgb, var(--color-bg-main) 55%, transparent)',
                  color: 'var(--color-blue-bright)',
                }}>
                  {image ? <img src={image} alt="" width={34} height={34} style={{ display: 'block', objectFit: 'cover' }} /> : Icon && <Icon />}
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
