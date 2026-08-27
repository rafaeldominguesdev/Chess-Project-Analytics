import { ChesscomMarkIcon, LichessMarkIcon } from '../PlatformIcons'

// Sombra de texto padrão da Home (o rodapé fica sobre a imagem de fundo da mascote, que cobre a
// altura inteira da página) — mesma técnica usada no hero e nos feature cards.
const TEXT_SHADOW = '0 1px 6px rgba(0,0,0,0.7)'

const MICRO_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--color-gray-muted)',
  textShadow: TEXT_SHADOW,
}

const FERRAMENTAS = 'Revisão lance a lance · Puzzles táticos · Treino de aberturas e finais · Tabuleiro de análise · Editor de posição · Relatório do jogador · Jogar contra a Capivara'

/**
 * Rodapé só da Home — informativo (marca, com o que foi construído, aviso de projeto pessoal).
 * Não tem links de navegação de propósito: as ferramentas ficam todas na Sidebar, e o app não
 * tem páginas de marketing (preço, blog) que justificassem colunas de link. Composição/paleta
 * próprias do Chess Noir — não espelha o rodapé de nenhum concorrente.
 */
export function HomeFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        marginTop: 48,
        padding: '28px clamp(8px, 2vw, 16px) 20px',
        // Divisor superior em anel (hairline) + leve opacidade/blur pra legibilidade sobre a
        // imagem de fundo — consistente com os feature cards "vidro fosco" da Home.
        boxShadow: '0 -1px 0 0 color-mix(in srgb, var(--color-gray-border) 65%, transparent)',
        background: 'color-mix(in srgb, var(--color-bg-main) 82%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '28px 48px' }}>
        {/* Marca + tagline */}
        <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="cl-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--color-text-on-dark)', textShadow: TEXT_SHADOW }}>
            Chess<span style={{ color: 'var(--color-blue-bright)' }}>Noir</span>
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.6, textShadow: TEXT_SHADOW }}>
            Análise de xadrez com o Stockfish completo, lance a lance, 100% no seu navegador.
          </span>
        </div>

        {/* Construído com */}
        <div style={{ flex: '0 1 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={MICRO_LABEL}>Construído com</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px' }}>
            <BuiltWith icon={<ChesscomMarkIcon width={16} height={16} />} label="Chess.com" />
            <BuiltWith icon={<LichessMarkIcon width={16} height={16} />} label="Lichess" />
            <BuiltWith icon={<img src="/stockfish-logo.png" alt="" width={16} height={16} style={{ display: 'block', borderRadius: 3 }} />} label="Stockfish" />
          </div>
        </div>

        {/* O que dá pra fazer */}
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={MICRO_LABEL}>O que dá pra fazer aqui</span>
          <span style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.7, textShadow: TEXT_SHADOW }}>
            {FERRAMENTAS}
          </span>
        </div>
      </div>

      <div style={{
        maxWidth: 1080, margin: '20px auto 0', paddingTop: 16,
        boxShadow: '0 -1px 0 0 color-mix(in srgb, var(--color-gray-border) 45%, transparent)',
        display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'space-between',
        fontSize: 11.5, color: 'var(--color-gray-muted)', textShadow: TEXT_SHADOW,
      }}>
        <span>Projeto pessoal de portfólio e aprendizado. Não afiliado ao Chess.com, ao Lichess nem ao Stockfish.</span>
        <span>© 2026 Chess Noir</span>
      </div>
    </footer>
  )
}

function BuiltWith({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-on-dark)', opacity: 0.85, textShadow: TEXT_SHADOW }}>
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      {label}
    </span>
  )
}
