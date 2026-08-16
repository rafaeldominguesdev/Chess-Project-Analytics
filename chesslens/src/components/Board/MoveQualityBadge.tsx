import { QUALITY_CONFIG, qualityAlphaColor } from '../../utils/moveClassifier'
import type { MoveQuality } from '../../utils/moveClassifier'
import { QUALITY_ICONS } from './QualityIcons'

interface MoveQualityBadgeProps {
  quality: MoveQuality
  size?: 'sm' | 'md' | 'lg'
}

// Ícone sempre 2px maior que o texto em todos os tamanhos — mantém o mesmo peso visual relativo
// entre categorias com ícone vetorial (brilhante, livro, melhor, ótimo, bom, chance perdida) e as
// que ainda usam símbolo de texto (excelente !, imprecisão ?!, erro ?, capivarada ??).
const SIZES = {
  sm: { fontSize: 12, icon: 14, padding: '3px 6px' },
  md: { fontSize: 15, icon: 17, padding: '3px 8px' },
  lg: { fontSize: 20, icon: 22, padding: '5px 11px' },
} as const

export function MoveQualityBadge({ quality, size = 'sm' }: MoveQualityBadgeProps) {
  const cfg = QUALITY_CONFIG[quality]
  const Icon = QUALITY_ICONS[quality]
  const s = SIZES[size]

  return (
    <span
      title={cfg.label}
      style={{
        fontSize: s.fontSize,
        padding: s.padding,
        borderRadius: 'var(--radius-sm)',
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontWeight: 800,
        lineHeight: 1.2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `1px solid ${qualityAlphaColor(quality, 0.4)}`,
        boxShadow: `0 2px 6px -1px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset`,
      }}
    >
      {Icon ? <Icon width={s.icon} height={s.icon} /> : cfg.symbol}
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

  return (
    <span
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
      {Icon ? <Icon width={size * 0.58} height={size * 0.58} /> : cfg.symbol}
    </span>
  )
}
