import type { ChessComStats, ChessComTimeClassStat } from '../../hooks/usePlayerSearch'
import { RatingCard } from './RatingCard'

const TIME_CLASS_META: Record<string, { label: string; emoji: string }> = {
  chess_bullet: { label: 'Bullet', emoji: '⚡' },
  chess_blitz: { label: 'Blitz', emoji: '⚡⚡' },
  chess_rapid: { label: 'Rápida', emoji: '🕐' },
  chess_daily: { label: 'Daily', emoji: '📅' },
  chess960_daily: { label: 'Chess960', emoji: '♞' },
  chess_daily960: { label: 'Chess960', emoji: '♞' },
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}
    >
      {entries.map(([key, stat]) => {
        const meta = TIME_CLASS_META[key]
        return (
          <RatingCard
            key={key}
            label={meta.label}
            emoji={meta.emoji}
            rating={stat.last?.rating}
            bestRating={stat.best?.rating}
            wins={stat.record?.win}
            losses={stat.record?.loss}
            draws={stat.record?.draw}
          />
        )
      })}

      <div
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>🎯</span>
          <span>Total</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
          {total}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>partidas jogadas</div>
      </div>
    </div>
  )
}
