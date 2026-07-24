interface RatingCardProps {
  label: string
  emoji: string
  rating?: number
  bestRating?: number
  wins?: number
  losses?: number
  draws?: number
}

/** Card com o rating de uma modalidade (blitz, bullet, rápida, daily, chess960...). */
export function RatingCard({ label, emoji, rating, bestRating, wins, losses, draws }: RatingCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <span>{emoji}</span>
        <span>{label}</span>
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
        {rating ?? '—'}
      </div>

      {bestRating !== undefined && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Melhor: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{bestRating}</span>
        </div>
      )}

      {(wins !== undefined || losses !== undefined || draws !== undefined) && (
        <div style={{ display: 'flex', gap: 8, fontSize: 11, marginTop: 2 }}>
          <span style={{ color: '#27ae60' }}>{wins ?? 0}V</span>
          <span style={{ color: 'var(--text-muted)' }}>{draws ?? 0}E</span>
          <span style={{ color: '#e74c3c' }}>{losses ?? 0}D</span>
        </div>
      )}
    </div>
  )
}
