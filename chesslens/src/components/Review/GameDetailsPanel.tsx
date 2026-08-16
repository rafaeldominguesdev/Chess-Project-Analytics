import type { GameInfo } from '../../types/chess.types'

interface GameDetailsPanelProps {
  gameInfo: GameInfo
  /** Nome da abertura identificada (ex: "C60 · Ruy Lopez"), se o banco ECO achou uma linha pra essa partida. */
  opening?: string | null
}

/** Ficha compacta da partida (evento, data, resultado, término, abertura) — grid de 2 colunas. */
export function GameDetailsPanel({ gameInfo, opening }: GameDetailsPanelProps) {
  const fields: [string, string][] = [
    ['Evento', gameInfo.event],
    ...(opening ? ([['Abertura', opening]] as [string, string][]) : []),
    ['Resultado', gameInfo.result],
    ...(gameInfo.termination ? ([['Término', gameInfo.termination]] as [string, string][]) : []),
  ]

  return (
    <div
      className="cl-fade-in"
      style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        overflow: 'hidden',
        boxShadow: '0 4px 14px -4px rgba(0,0,0,0.3)',
      }}
    >
      {fields.map(([k, v]) => {
        // "Abertura" tende a ter nomes longos ("Queen's Gambit Declined: Normal Defense") —
        // ocupa a linha inteira do grid e pode quebrar em vez de cortar com reticências.
        const isWide = k === 'Abertura'
        return (
          <div
            key={k}
            style={{
              background: 'var(--surface)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2,
              minWidth: 0, gridColumn: isWide ? '1 / -1' : undefined,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
            <span
              style={{
                fontSize: 12.5, fontWeight: k === 'Resultado' ? 700 : 500,
                color: k === 'Resultado' ? 'var(--accent)' : 'var(--text)',
                overflow: isWide ? 'visible' : 'hidden',
                textOverflow: isWide ? 'clip' : 'ellipsis',
                whiteSpace: isWide ? 'normal' : 'nowrap',
                lineHeight: 1.35,
              }}
              title={isWide ? undefined : v}
            >
              {v || '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
