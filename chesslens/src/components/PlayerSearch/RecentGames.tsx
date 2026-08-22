import type { RecentGame } from '../../hooks/useRecentGames'
import { TIME_CLASS_META } from './StatsGrid'
import { AnalyzeIcon, ExternalLinkIcon, VariantTimeIcon } from './icons'

const OUTCOME_META: Record<RecentGame['outcome'], { label: string; color: string }> = {
  win: { label: 'Vitória', color: 'var(--color-success)' },
  draw: { label: 'Empate', color: 'var(--color-draw)' },
  loss: { label: 'Derrota', color: 'var(--color-error)' },
}

function formatWhen(endTime: number): string {
  const diff = Date.now() / 1000 - endTime
  const days = Math.floor(diff / 86400)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months > 1 ? 'meses' : 'mês'} atrás`
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(endTime * 1000))
}

interface RecentGamesProps {
  games: RecentGame[]
  loading: boolean
  onAnalyze: (pgn: string) => void
}

export function RecentGames({ games, loading, onAnalyze }: RecentGamesProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 56, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-panel)', opacity: 0.6 - i * 0.08 }} />
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
        Nenhuma partida recente encontrada.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {games.map((g, i) => {
        const meta = TIME_CLASS_META[g.timeClass]
        const Icon = meta?.icon ?? VariantTimeIcon
        const accent = meta?.accent ?? 'var(--color-gray-muted)'
        const outcome = OUTCOME_META[g.outcome]

        return (
          <div
            key={g.url + i}
            className="cl-row-in cl-game-row"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-gray-border)',
              animationDelay: `${i * 35}ms`,
            }}
          >
            <div style={{
              width: 4, alignSelf: 'stretch', borderRadius: 2, background: outcome.color, flexShrink: 0,
            }} />

            <Icon width={32} height={32} style={{ color: accent, flexShrink: 0 }} />

            <span
              title={g.color === 'white' ? 'Jogou de brancas' : 'Jogou de pretas'}
              style={{
                width: 15, height: 15, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                background: g.color === 'white' ? '#f5f5f5' : '#1a1a1a',
                border: '1.5px solid var(--color-gray-border)',
              }}
            />

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span title={g.opponent} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  vs {g.opponent}
                </span>
                {g.opponentRating !== null && (
                  <span className="cl-mono" style={{ fontSize: 11, color: 'var(--color-gray-muted)', flexShrink: 0 }}>({g.opponentRating})</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-gray-muted)' }}>
                {formatWhen(g.endTime)}{g.rated ? '' : ' · casual'}
              </div>
            </div>

            <span style={{ fontSize: 11, fontWeight: 700, color: outcome.color, flexShrink: 0 }}>{outcome.label}</span>

            <a
              href={g.url}
              target="_blank"
              rel="noreferrer"
              title="Ver partida original"
              aria-label="Ver partida original (abre em nova aba)"
              style={{ color: 'var(--color-gray-muted)', display: 'flex', flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon width={14} height={14} />
            </a>

            <button
              onClick={() => onAnalyze(g.pgn)}
              title="Analisar esta partida"
              className="cl-btn cl-btn-accent cl-btn-sm"
              style={{ gap: 5, flexShrink: 0, width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11.5, whiteSpace: 'nowrap' }}
            >
              <AnalyzeIcon width={13} height={13} />
              Analisar
            </button>
          </div>
        )
      })}
    </div>
  )
}
