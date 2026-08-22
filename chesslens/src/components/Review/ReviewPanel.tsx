import type { ClassifiedMove, GameInfo } from '../../types/chess.types'
import { EvalGraph } from '../Analysis/EvalGraph'
import { PlayerComparison } from '../Analysis/PlayerComparison'
import { MoveList } from '../Analysis/MoveList'
import { Panel } from '../Panel'
import { CoachComment } from './CoachComment'
import { BoardControls } from '../Board/BoardControls'

/** Barra de progresso animada da análise do Stockfish rodando em segundo plano. */
function AnalysisProgress({ progress }: { progress: { done: number; total: number } }) {
  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0
  const finished = pct >= 100

  return (
    <div className="cl-fade-in" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-gray-muted)', fontWeight: 700, minWidth: 0 }}>
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: finished ? 'var(--color-success)' : 'var(--color-blue-bright)',
              animation: finished ? 'none' : 'cl-pulse-dot 1.1s ease-in-out infinite',
            }}
          />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {finished ? 'Análise do Stockfish concluída' : 'Stockfish analisando a partida…'}
          </span>
        </span>
        <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-text-on-dark)', fontWeight: 800, flexShrink: 0 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--color-bg-panel)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%', width: `${pct}%`, borderRadius: 3,
            background: finished ? 'var(--color-success)' : 'var(--color-blue-bright)',
            transition: 'width 0.35s ease, background 0.3s ease',
          }}
        />
      </div>
      {/* keyframe local do dot pulsante — não mexe em index.css, que é de outro agente */}
      <style>{`@keyframes cl-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}

interface ReviewPanelProps {
  gameInfo: GameInfo | null
  /** false = tela de resumo (fotos + precisão + White vs Black); true = lances com avaliação. */
  reviewStarted: boolean
  moves: ClassifiedMove[]
  currentMoveIndex: number
  onGoTo: (index: number) => void
  progress: { done: number; total: number } | null
  evals: number[]
  whiteAvatar?: string | null
  blackAvatar?: string | null
  onStartReview?: () => void
  isLoaded: boolean
  onFirst?: () => void
  onPrev?: () => void
  onNext?: () => void
  onLast?: () => void
  onFlipBoard?: () => void
}

export function ReviewPanel({
  gameInfo, reviewStarted,
  moves, currentMoveIndex, onGoTo, progress, evals,
  whiteAvatar, blackAvatar, onStartReview,
  isLoaded, onFirst, onPrev, onNext, onLast, onFlipBoard,
}: ReviewPanelProps) {
  const whiteName = gameInfo?.white ?? 'Brancas'
  const blackName = gameInfo?.black ?? 'Pretas'

  return (
    <aside className="cl-tool-aside">
      <div
        className="cl-tool-aside-scroll"
        style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          paddingRight: 2,
        }}
      >
        {!reviewStarted ? (
          <div key="summary" className="cl-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Tela de resumo: fotos lado a lado + precisão + comparação por categoria.
                O Stockfish já está analisando em segundo plano, então esses números
                vão se populando sozinhos antes mesmo de clicar em "Começar a Revisão". */}
            <div className="cl-card" style={{ padding: 13 }}>
              {progress && <AnalysisProgress progress={progress} />}
              <PlayerComparison
                moves={moves}
                whiteName={whiteName}
                blackName={blackName}
                whiteAvatar={whiteAvatar}
                blackAvatar={blackAvatar}
                whiteElo={gameInfo?.whiteElo}
                blackElo={gameInfo?.blackElo}
                result={gameInfo?.result}
                termination={gameInfo?.termination}
              />
            </div>

            <button
              onClick={onStartReview}
              className="cl-btn cl-btn-accent"
              style={{ marginTop: 4, padding: '13px 0', fontSize: 14.5 }}
            >
              Começar a Revisão
            </button>
          </div>
        ) : (
          <div key="review" className="cl-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Tela de revisão: comentário do coach + gráfico + lances com avaliação por lance */}
            <div className="cl-row-in" style={{ animationDelay: '10ms' }}>
              <CoachComment move={currentMoveIndex >= 0 ? moves[currentMoveIndex] ?? null : null} />
            </div>

            <div className="cl-row-in" style={{ animationDelay: '30ms' }}>
              <Panel icon="📈" title="Avaliação" right={progress ? <span className="cl-mono" style={{ fontSize: 10, color: 'var(--color-gray-muted)' }}>{Math.round((progress.done / progress.total) * 100)}%</span> : undefined}>
                <EvalGraph evals={evals} currentPosition={currentMoveIndex + 1} onSeek={(i) => onGoTo(i - 1)} />
              </Panel>
            </div>

            <div className="cl-row-in" style={{ animationDelay: '70ms' }}>
              <Panel icon="📜" title="Lances" right={progress ? <span style={{ fontSize: 10, color: 'var(--color-gray-muted)' }}>analisando…</span> : undefined}>
                <MoveList moves={moves} currentMoveIndex={currentMoveIndex} onGoTo={onGoTo} />
              </Panel>
            </div>

            <div className="cl-row-in" style={{ animationDelay: '100ms' }}>
              <BoardControls
                isLoaded={isLoaded}
                currentMoveIndex={currentMoveIndex}
                totalMoves={moves.length}
                onFirst={onFirst}
                onPrev={onPrev}
                onNext={onNext}
                onLast={onLast}
                onFlip={onFlipBoard}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
