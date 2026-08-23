import { Chess } from 'chess.js'
import type { ClassifiedMove, GameInfo } from '../../types/chess.types'
import type { StockfishEval } from '../../hooks/useStockfish'
import { EvalGraph } from '../Analysis/EvalGraph'
import { PlayerComparison } from '../Analysis/PlayerComparison'
import { MoveList } from '../Analysis/MoveList'
import { Panel } from '../Panel'
import { CoachComment } from './CoachComment'
import { BoardControls } from '../Board/BoardControls'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

// Quantos lances de cada linha do motor mostrar como texto no painel "Motor" (prévia curta, não
// a variante inteira) — mesma constante/princípio do painel equivalente do Tabuleiro de análise
// livre (`AnalysisBoardView.tsx`). Duplicado aqui de propósito (componente local, sem extrair
// um compartilhado) pra não gerar conflito com outros agentes trabalhando em paralelo.
const PV_PREVIEW_PLIES = 4

// Mesma formatação da etiqueta da barra de avaliação — cp/mate do Stockfish vêm relativos a
// quem tem a vez, converte pra brancas.
function formatLineEval(line: StockfishEval, sideToMove: 'w' | 'b'): string {
  if (line.mate !== null) {
    const whiteMate = sideToMove === 'w' ? line.mate : -line.mate
    return `#${Math.abs(whiteMate)}`
  }
  const whiteCp = sideToMove === 'w' ? (line.cp ?? 0) : -(line.cp ?? 0)
  if (whiteCp > 0) return `+${(whiteCp / 100).toFixed(1)}`
  if (whiteCp < 0) return (whiteCp / 100).toFixed(1)
  return '0.0'
}

// Converte os primeiros lances (UCI, ex: "e2e4") de uma linha do motor pra SAN (ex: "e4"),
// jogando numa cópia da posição atual — só pra exibição, não afeta o tabuleiro real.
function pvToSan(fen: string, pv: string[], maxPlies: number): string[] {
  const game = new Chess(fen)
  const sans: string[] = []
  for (const uci of pv.slice(0, maxPlies)) {
    if (uci.length < 4) break
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
    try {
      const move = game.move({ from, to, promotion })
      if (!move) break
      sans.push(move.san)
    } catch {
      break // linha do motor não bate mais com a posição atual (lance acabou de mudar) — ignora o resto
    }
  }
  return sans
}

/** Painel do motor — mesma apresentação do painel "Motor" do Tabuleiro de análise livre
 *  (`AnalysisBoardView.tsx`): até 3 melhores linhas como texto (eval + prévia de lances em SAN)
 *  e o estado calculando/parado do motor, agora pra posição atual da revisão de partida (a
 *  posição correspondente a `currentMoveIndex`), não só pro tabuleiro de análise livre. */
function EnginePanel({
  fen, lines, isAnalyzing,
}: {
  fen: string
  lines: (StockfishEval | null)[]
  isAnalyzing: boolean
}) {
  const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const previews = lines.map((line) => (line ? pvToSan(fen, line.pv, PV_PREVIEW_PLIES) : []))
  const depth = lines[0]?.depth

  return (
    <div className="cl-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Motor
        </span>
        <span aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--color-gray-muted)' }}>
          <span
            aria-hidden
            className={isAnalyzing ? 'cl-dot-pulse' : undefined}
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: isAnalyzing ? 'var(--color-blue-bright)' : 'var(--color-success)',
            }}
          />
          {isAnalyzing ? 'Calculando' : depth ? `Profundidade ${depth}` : 'Parado'}
        </span>
      </div>

      {!lines[0] ? (
        <p style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>Aguardando primeira análise...</p>
      ) : (
        // Sempre desenha as `lines.length` linhas (3), mesmo antes do engine preencher todas —
        // ver o mesmo comentário em AnalysisBoardView.tsx (painel equivalente do Tabuleiro de
        // análise livre): evita o painel "piscar" de 3 pra 1-2 linhas ao trocar de posição.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, opacity: line ? (i === 0 ? 1 : 0.65) : 0.35 }}>
              <span className="cl-mono" style={{
                fontSize: 12, fontWeight: 800, minWidth: 36, flexShrink: 0,
                color: i === 0 ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)',
              }}>
                {line ? formatLineEval(line, sideToMove) : '···'}
              </span>
              <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line ? (previews[i]?.join(' ') || '—') : 'calculando…'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Barra de progresso animada da análise do Stockfish rodando em segundo plano. */
function AnalysisProgress({ progress }: { progress: { done: number; total: number } }) {
  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0
  const finished = pct >= 100
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div className="cl-fade-in" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-gray-muted)', fontWeight: 700, minWidth: 0 }}>
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: finished ? 'var(--color-success)' : 'var(--color-blue-bright)',
              animation: (finished || reducedMotion) ? 'none' : 'cl-pulse-dot 1.1s ease-in-out infinite',
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
  /** FEN da posição atual da revisão (a de `currentMoveIndex`) — usada pelo painel "Motor". */
  currentFen: string
  /** Até 3 melhores linhas do Stockfish, calculadas ao vivo pra `currentFen` (multipv). */
  engineLines: (StockfishEval | null)[]
  /** Se o motor está calculando a posição atual (vs. parado/pronto) — mesmo indicador do
   *  Tabuleiro de análise livre. */
  engineIsAnalyzing: boolean
}

export function ReviewPanel({
  gameInfo, reviewStarted,
  moves, currentMoveIndex, onGoTo, progress, evals,
  whiteAvatar, blackAvatar, onStartReview,
  isLoaded, onFirst, onPrev, onNext, onLast, onFlipBoard,
  currentFen, engineLines, engineIsAnalyzing,
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
            {/* Tela de revisão: comentário do coach + motor + gráfico + lances com avaliação por lance */}
            <div className="cl-row-in" style={{ animationDelay: '10ms' }}>
              <CoachComment move={currentMoveIndex >= 0 ? moves[currentMoveIndex] ?? null : null} />
            </div>

            <div className="cl-row-in" style={{ animationDelay: '25ms' }}>
              <EnginePanel fen={currentFen} lines={engineLines} isAnalyzing={engineIsAnalyzing} />
            </div>

            <div className="cl-row-in" style={{ animationDelay: '45ms' }}>
              <Panel icon="📈" title="Avaliação" right={progress ? <span className="cl-mono" style={{ fontSize: 10, color: 'var(--color-gray-muted)' }}>{Math.round((progress.done / progress.total) * 100)}%</span> : undefined}>
                <EvalGraph evals={evals} currentPosition={currentMoveIndex + 1} onSeek={(i) => onGoTo(i - 1)} />
              </Panel>
            </div>

            <div className="cl-row-in" style={{ animationDelay: '80ms' }}>
              <Panel icon="📜" title="Lances" right={progress ? <span style={{ fontSize: 10, color: 'var(--color-gray-muted)' }}>analisando…</span> : undefined}>
                <MoveList moves={moves} currentMoveIndex={currentMoveIndex} onGoTo={onGoTo} />
              </Panel>
            </div>

            <div className="cl-row-in" style={{ animationDelay: '110ms' }}>
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
