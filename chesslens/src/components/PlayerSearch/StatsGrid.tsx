import type { ChessComStats, ChessComTimeClassStat } from '../../hooks/usePlayerSearch'
import { RatingCard } from './RatingCard'
import { BulletTimeIcon, BlitzTimeIcon, RapidTimeIcon, DailyTimeIcon, VariantTimeIcon } from './icons'

export const TIME_CLASS_META: Record<string, { label: string; icon: typeof BulletTimeIcon; accent: string }> = {
  chess_bullet: { label: 'Bullet', icon: BulletTimeIcon, accent: '#E3AA24' },
  chess_blitz: { label: 'Blitz', icon: BlitzTimeIcon, accent: '#F0B429' },
  chess_rapid: { label: 'Rápida', icon: RapidTimeIcon, accent: '#4CAF50' },
  chess_daily: { label: 'Daily', icon: DailyTimeIcon, accent: '#6BBF7B' },
  chess960_daily: { label: 'Chess960', icon: VariantTimeIcon, accent: '#B08CE0' },
  chess_daily960: { label: 'Chess960', icon: VariantTimeIcon, accent: '#B08CE0' },
  // Chaves "cruas" (speed do Lichess) — mesmos ícones, pra RecentGames reconhecer partidas de lá também.
  bullet: { label: 'Bullet', icon: BulletTimeIcon, accent: '#E3AA24' },
  blitz: { label: 'Blitz', icon: BlitzTimeIcon, accent: '#F0B429' },
  rapid: { label: 'Rápida', icon: RapidTimeIcon, accent: '#4CAF50' },
  daily: { label: 'Daily', icon: DailyTimeIcon, accent: '#6BBF7B' },
  classical: { label: 'Clássica', icon: RapidTimeIcon, accent: '#4CAF50' },
  correspondence: { label: 'Correspondência', icon: DailyTimeIcon, accent: '#6BBF7B' },
  ultraBullet: { label: 'Ultra Bullet', icon: BulletTimeIcon, accent: '#E3AA24' },
}

function totalGames(stats: ChessComStats): number {
  let total = 0
  for (const value of Object.values(stats)) {
    const s = value as ChessComTimeClassStat | undefined
    if (!s?.record) continue
    total += (s.record.win ?? 0) + (s.record.loss ?? 0) + (s.record.draw ?? 0)
  }
  return total
}

/** Grid responsivo com um RatingCard por modalidade presente + total de partidas. */
export function StatsGrid({ stats }: { stats: ChessComStats }) {
  const entries = Object.entries(stats).filter(
    ([key, value]) => TIME_CLASS_META[key] && value?.last?.rating !== undefined,
  ) as [string, ChessComTimeClassStat][]

  const total = totalGames(stats)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 12,
      }}
    >
      {entries.map(([key, stat], i) => {
        const meta = TIME_CLASS_META[key]
        return (
          <RatingCard
            key={key}
            label={meta.label}
            Icon={meta.icon}
            accent={meta.accent}
            rating={stat.last?.rating}
            bestRating={stat.best?.rating}
            wins={stat.record?.win}
            losses={stat.record?.loss}
            draws={stat.record?.draw}
            delay={i}
          />
        )
      })}

      <div
        className="cl-stat-pop"
        style={{
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-gray-border)',
          borderRadius: 8,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'center',
          animationDelay: `${entries.length * 40}ms`,
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--color-gray-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total de partidas
        </div>
        <div className="cl-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.1 }}>
          {total}
        </div>
      </div>
    </div>
  )
}
