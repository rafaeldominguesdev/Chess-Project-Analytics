import { QUALITY_CONFIG } from '../../utils/moveClassifier'
import type { MoveQuality } from '../../utils/moveClassifier'

interface MoveQualityBadgeProps {
  quality: MoveQuality
  size?: 'sm' | 'md' | 'lg'
}

export function MoveQualityBadge({ quality, size = 'sm' }: MoveQualityBadgeProps) {
  const cfg = QUALITY_CONFIG[quality]
  const sizes = { sm: { fontSize: 10, padding: '1px 4px' }, md: { fontSize: 13, padding: '2px 6px' }, lg: { fontSize: 18, padding: '4px 8px' } }
  const s = sizes[size]

  return (
    <span
      title={cfg.label}
      style={{
        fontSize: s.fontSize,
        padding: s.padding,
        borderRadius: 4,
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        lineHeight: 1.2,
        display: 'inline-block',
        flexShrink: 0,
      }}
    >
      {cfg.symbol}
    </span>
  )
}
