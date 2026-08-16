import type { ReactElement, SVGProps } from 'react'
import { TrophyIcon } from './icons'

interface RatingCardProps {
  label: string
  Icon: (props: SVGProps<SVGSVGElement>) => ReactElement
  accent: string
  rating?: number
  bestRating?: number
  wins?: number
  losses?: number
  draws?: number
  delay?: number
}

/** Card com o rating de uma modalidade (blitz, bullet, rápida, daily, chess960...). */
export function RatingCard({ label, Icon, accent, rating, bestRating, wins, losses, draws, delay = 0 }: RatingCardProps) {
  const total = (wins ?? 0) + (losses ?? 0) + (draws ?? 0)
  const winRate = total > 0 ? Math.round(((wins ?? 0) / total) * 100) : null

  return (
    <div
      className="cl-stat-pop cl-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        animationDelay: `${delay * 40}ms`,
      }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 72, height: 72, borderRadius: '50%', background: accent, opacity: 0.14 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon width={38} height={38} style={{ color: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>

      <div className="cl-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.1 }}>
        {rating ?? '—'}
      </div>

      {bestRating !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-gray-muted)' }}>
          <TrophyIcon width={12} height={12} style={{ color: 'var(--color-blue-bright)' }} />
          Máx. <span className="cl-mono" style={{ color: 'var(--color-text-on-dark)', fontWeight: 600 }}>{bestRating}</span>
        </div>
      )}

      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: 'var(--color-gray-border)' }}>
            <div style={{ width: `${((wins ?? 0) / total) * 100}%`, background: 'var(--color-success)' }} />
            <div style={{ width: `${((draws ?? 0) / total) * 100}%`, background: 'var(--color-draw)' }} />
            <div style={{ width: `${((losses ?? 0) / total) * 100}%`, background: 'var(--color-error)' }} />
          </div>
          <div className="cl-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--color-gray-muted)' }}>
            <span>{wins ?? 0}V · {draws ?? 0}E · {losses ?? 0}D</span>
            {winRate !== null && <span style={{ fontWeight: 700, color: 'var(--color-text-on-dark)' }}>{winRate}%</span>}
          </div>
        </div>
      )}
    </div>
  )
}
