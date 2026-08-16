import type { LichessStats } from '../../hooks/useLichessSearch'
import { RatingCard } from './RatingCard'
import { TIME_CLASS_META } from './StatsGrid'

type PerfKey = 'bullet' | 'blitz' | 'rapid' | 'classical'
const KEYS: PerfKey[] = ['bullet', 'blitz', 'rapid', 'classical']

/** Grid de ratings do Lichess — mesma peça visual do chess.com (RatingCard), sem melhor rating
 *  nem histórico de V/E/D por modalidade porque a API pública do Lichess não expõe isso. */
export function LichessStatsGrid({ stats }: { stats: LichessStats }) {
  const entries = KEYS
    .map((key) => ({ key, perf: stats[key] }))
    .filter((e): e is { key: PerfKey; perf: NonNullable<LichessStats['bullet']> } => !!e.perf && e.perf.games > 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
      {entries.map(({ key, perf }, i) => {
        const meta = TIME_CLASS_META[key]
        return (
          <RatingCard
            key={key}
            label={meta.label}
            Icon={meta.icon}
            accent={meta.accent}
            rating={perf.rating}
            delay={i}
          />
        )
      })}

      <div
        className="cl-stat-pop"
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'center',
          animationDelay: `${entries.length * 40}ms`,
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total de partidas
        </div>
        <div className="cl-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
          {stats.totalGames}
        </div>
      </div>
    </div>
  )
}
