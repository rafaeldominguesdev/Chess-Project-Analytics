import type { ClassifiedMove, GameInfo } from '../../types/chess.types'
import type { StockfishEval } from '../../hooks/useStockfish'
import { calcAccuracy } from '../../utils/moveClassifier'
import { AiCommentary } from './AiCommentary'
import { EvalGraph } from '../Analysis/EvalGraph'
import { PlayerComparison } from '../Analysis/PlayerComparison'
import { OpeningInfo } from '../Analysis/OpeningInfo'
import { EnginePanel } from '../Analysis/EnginePanel'
import { MoveList } from '../Analysis/MoveList'
import { Panel } from '../Panel'

interface ReviewPanelProps {
  gameInfo: GameInfo | null
  evaluation: StockfishEval | null
  isReady: boolean
  isAnalyzing: boolean
  isLoaded: boolean
  moves: ClassifiedMove[]
  currentMoveIndex: number
  onGoTo: (index: number) => void
  progress: { done: number; total: number } | null
  evals: number[]
  whiteAvatar?: string | null
  blackAvatar?: string | null
  onStartReview?: () => void
}

export function ReviewPanel({
  gameInfo, evaluation, isReady, isAnalyzing, isLoaded,
  moves, currentMoveIndex, onGoTo, progress, evals,
  whiteAvatar, blackAvatar, onStartReview,
}: ReviewPanelProps) {
  const whiteName = gameInfo?.white ?? 'Brancas'
  const blackName = gameInfo?.black ?? 'Pretas'
  const hasClassifications = isLoaded && moves.some((m) => m.classification)

  const whiteAccuracy = calcAccuracy(moves, 'w')
  const blackAccuracy = calcAccuracy(moves, 'b')
  const blunderCount = moves.filter((m) => m.classification === 'blunder').length
  const brilliantCount = moves.filter((m) => m.classification === 'brilliant').length

  return (
    <aside style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', maxHeight: 'calc(100vh - 88px)',
          paddingRight: 2,
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 16 }}>⭐</span>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', flex: 1 }}>Revisão da Partida</h2>
        </div>

        {/* Comentário de IA (baseado em regras, não é um LLM real) */}
        {isLoaded && (
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <AiCommentary
              result={gameInfo?.result ?? '*'}
              whiteAccuracy={whiteAccuracy}
              blackAccuracy={blackAccuracy}
              blunderCount={blunderCount}
              brilliantCount={brilliantCount}
              moveCount={moves.length}
            />
          </div>
        )}

        {/* Gráfico de avaliação */}
        {isLoaded && (
          <Panel icon="📈" title="Avaliação" right={progress ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Math.round((progress.done / progress.total) * 100)}%</span> : undefined}>
            <EvalGraph evals={evals} currentPosition={currentMoveIndex + 1} onSeek={(i) => onGoTo(i - 1)} />
          </Panel>
        )}

        {/* Precisão + contagem por categoria (10 classificações) */}
        {hasClassifications && (
          <Panel icon="⚔️" title="White vs Black">
            <PlayerComparison
              moves={moves}
              whiteName={whiteName}
              blackName={blackName}
              whiteAvatar={whiteAvatar}
              blackAvatar={blackAvatar}
            />
          </Panel>
        )}

        {/* Painéis já existentes — mantidos abaixo do novo conteúdo */}
        {gameInfo && <OpeningInfo gameInfo={gameInfo} />}

        <EnginePanel evaluation={evaluation} isReady={isReady} isAnalyzing={isAnalyzing} isLoaded={isLoaded} />

        <Panel icon="📜" title="Lances" right={progress ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>analisando…</span> : undefined}>
          <MoveList moves={moves} currentMoveIndex={currentMoveIndex} onGoTo={onGoTo} />
        </Panel>

        {/* Botão fixo no rodapé do painel */}
        <button
          onClick={onStartReview}
          disabled={!isLoaded}
          style={{
            position: 'sticky', bottom: 0,
            marginTop: 4, padding: '13px 0',
            borderRadius: 10, border: 'none',
            background: isLoaded ? 'var(--accent)' : 'var(--surface2)',
            color: isLoaded ? '#fff' : 'var(--text-muted)',
            fontSize: 14, fontWeight: 800,
            cursor: isLoaded ? 'pointer' : 'not-allowed',
            boxShadow: '0 -8px 16px -4px rgba(0,0,0,0.35)',
          }}
        >
          Começar a Revisão
        </button>
      </div>
    </aside>
  )
}
