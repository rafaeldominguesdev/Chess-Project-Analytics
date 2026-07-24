import type { StockfishEval } from '../../hooks/useStockfish'

interface EnginePanelProps {
  evaluation: StockfishEval | null
  isReady: boolean
  isAnalyzing: boolean
  isLoaded: boolean
}

function EvalDisplay({ evaluation }: { evaluation: StockfishEval }) {
  const { cp, mate, depth, bestMove, pv } = evaluation

  const label = mate !== null
    ? (mate > 0 ? `Mate em ${mate}` : `Mate em ${Math.abs(mate)}`)
    : cp !== null
      ? (cp >= 0 ? `+${(cp / 100).toFixed(2)}` : `${(cp / 100).toFixed(2)}`)
      : '0.00'

  const isWhiteWinning = mate !== null ? mate > 0 : (cp ?? 0) >= 0

  const bestFrom = bestMove?.slice(0, 2) ?? null
  const bestTo = bestMove?.slice(2, 4) ?? null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className="text-lg font-bold"
          style={{ color: isWhiteWinning ? 'var(--text)' : '#e84040' }}
        >
          {label}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          depth {depth}
        </span>
      </div>

      {bestFrom && bestTo && (
        <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <span>Melhor:</span>
          <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>
            {bestFrom}→{bestTo}
          </span>
          {pv.length > 1 && (
            <span className="font-mono truncate" style={{ maxWidth: 120, color: 'var(--text-muted)' }}>
              {pv.slice(1, 4).join(' ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function EnginePanel({ evaluation, isReady, isAnalyzing, isLoaded }: EnginePanelProps) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Stockfish
        </h3>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isReady ? '#27ae60' : '#e74c3c' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {!isReady ? 'Carregando...' : isAnalyzing ? 'Analisando...' : 'Pronto'}
          </span>
        </div>
      </div>

      {!isLoaded ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Carregue uma partida para analisar.
        </p>
      ) : !isReady ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Inicializando engine...</span>
        </div>
      ) : evaluation ? (
        <EvalDisplay evaluation={evaluation} />
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
      )}
    </div>
  )
}
