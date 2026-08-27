import { QUALITY_CONFIG } from '../../analysis/moveClassifier'
import type { MoveQuality } from '../../analysis/moveClassifier'
import { QUALITY_ICONS } from './QualityIcons'

interface MoveQualityBadgeProps {
  quality: MoveQuality
  size?: 'sm' | 'md' | 'lg'
}

// Ícone sempre 2px maior que o texto em todos os tamanhos — mantém o mesmo peso visual relativo
// entre categorias com ícone vetorial (brilhante, livro, melhor, ótimo, bom, chance perdida) e as
// que ainda usam símbolo de texto (excelente !, imprecisão ?!, erro ?, capivarada ??).
// "md" é usado só pela lista de lances da Revisão de partida (`MoveList.tsx`) — aumentado a
// pedido direto do usuário ("aumenta ícones... deixe mais compreensível"), sem afetar "sm"
// (tabuleiro/coach, ícones bem pequenos de propósito) nem "lg" (já era o maior).
const SIZES = {
  sm: { fontSize: 12, icon: 14 },
  md: { fontSize: 19, icon: 21 },
  lg: { fontSize: 20, icon: 22 },
} as const

// O ícone de livro (contorno fino, sem preenchimento) lê visualmente menor que os ícones
// preenchidos (estrela, joinha) mesmo em caixa delimitadora do mesmo tamanho — traço fino
// "ocupa" menos peso visual que uma forma sólida. Compensa só esse (pedido direto do usuário,
// "aumenta o tamanho dele" sobre o ícone de livro especificamente — tanto na lista de lances
// quanto no círculo de anotação sobre a casa do tabuleiro, "aumenta em Tabuleiro"). O círculo
// (`SquareQualityMarker`) usa uma escala menor que o badge solto (`MoveQualityBadge`) porque lá
// o ícone já ocupa quase o disco inteiro (`size * 0.58`) — escalar igual (1.3x) estouraria a
// borda do círculo.
const BOOK_ICON_SCALE = 1.3

// Só o ícone/símbolo, sem caixinha ao redor (era um chip com fundo+borda antes — pedido pra
// ficar "como se fosse só ele", sem parecer emoji dentro de quadrado).
//
// `role="img" aria-label={cfg.label}` (não só `title`): `title` sozinho não é confiável em
// elemento não-interativo pra leitor de tela/teclado em vários navegadores/AT — o nome acessível
// de verdade tem que vir de `aria-label`. `title` continua junto só pelo tooltip nativo do mouse
// pra quem enxerga. O ícone/símbolo interno leva `aria-hidden` porque o nome já está no
// `aria-label` do wrapper — sem isso, o texto cru do símbolo (`??`, `?!`) vazaria pro nome
// acessível do `<button>` que costuma envolver este badge (lista de lances), duplicando a leitura.
export function MoveQualityBadge({ quality, size = 'sm' }: MoveQualityBadgeProps) {
  const cfg = QUALITY_CONFIG[quality]
  const Icon = QUALITY_ICONS[quality]
  const s = SIZES[size]
  const iconSize = quality === 'book' ? Math.round(s.icon * BOOK_ICON_SCALE) : s.icon

  return (
    <span
      role="img"
      aria-label={cfg.label}
      title={cfg.label}
      style={{
        fontSize: s.fontSize,
        color: cfg.color,
        fontWeight: 800,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
      }}
    >
      {Icon ? <Icon width={iconSize} height={iconSize} aria-hidden="true" /> : <span aria-hidden="true">{cfg.symbol}</span>}
    </span>
  )
}

interface SquareQualityMarkerProps {
  quality: MoveQuality
  size: number
}

/** Escolhe texto claro ou escuro conforme o brilho da cor de fundo (luminância aproximada). */
function textOnColor(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.58 ? '#151810' : '#FBFAF6'
}

/** Ícone de anotação sobre a casa do tabuleiro (estilo chess.com: círculo colorido no canto da casa). */
export function SquareQualityMarker({ quality, size }: SquareQualityMarkerProps) {
  const cfg = QUALITY_CONFIG[quality]
  const Icon = QUALITY_ICONS[quality]
  // As cores de categoria vão de amarelo/verde claros (imprecisão, bom, ótimo, melhor) a tons
  // escuros (livro, brilhante) — texto/ícone fixo em branco ficava ilegível nas claras.
  const fg = textOnColor(cfg.color)
  const iconSize = size * 0.58 * (quality === 'book' ? 1.15 : 1)

  return (
    <span
      role="img"
      aria-label={cfg.label}
      title={cfg.label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: cfg.color,
        border: '2px solid rgba(18,15,8,0.55)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
        color: fg,
        fontSize: size * 0.55,
        fontWeight: 800,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Icon ? <Icon width={iconSize} height={iconSize} aria-hidden="true" /> : <span aria-hidden="true">{cfg.symbol}</span>}
    </span>
  )
}
