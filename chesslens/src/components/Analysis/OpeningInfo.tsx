import type { GameInfo } from '../../types/chess.types'

interface OpeningInfoProps {
  gameInfo: GameInfo | null
}

export function OpeningInfo({ gameInfo }: OpeningInfoProps) {
  if (!gameInfo || (!gameInfo.eco && !gameInfo.opening)) return null

  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      {gameInfo.eco && (
        <span
          className="inline-block text-xs font-bold px-1.5 py-0.5 rounded mr-2"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          {gameInfo.eco}
        </span>
      )}
      {gameInfo.opening ? (
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {gameInfo.opening}
        </span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Abertura desconhecida</span>
      )}
    </div>
  )
}
