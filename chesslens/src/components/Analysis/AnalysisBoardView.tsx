import { useEffect, useMemo, useRef } from 'react'
import type { RefCallback } from 'react'
import { Chess } from 'chess.js'
import { useAnalysisBoard } from '../../hooks/useAnalysisBoard'
import type { PlayedMove } from '../../hooks/useAnalysisBoard'
import { useStockfish } from '../../hooks/useStockfish'
import type { StockfishEval } from '../../hooks/useStockfish'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'
import { BoardControls } from '../Board/BoardControls'
import { MoveQualityBadge } from '../Board/MoveQualityBadge'
import { identifyOpening, isBookMove } from '../../utils/openingsDatabase'
import { classifyMove, materialForSide, toWhiteCp } from '../../utils/moveClassifier'
import type { MoveQuality } from '../../utils/moveClassifier'

interface AnalysisBoardViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
  /** Posição de partida (ex: vinda de "Definir Posição") — padrão é o início do xadrez. */
  initialFen?: string
}

// As 3 melhores sugestões do Stockfish pra posição atual — todas no mesmo verde escuro (não
// muda de cor entre elas), só a ESPESSURA e a OPACIDADE marcam a força: a 1ª (melhor lance) bem
// grossa e sólida, a 2ª mais fina e um pouco mais transparente, a 3ª ainda mais fina e apagada.
const SUGGESTION_GREEN = '#1B7A3D'
const SUGGESTION_STYLE = [
  { color: SUGGESTION_GREEN, strokeWidth: 20, opacity: 0.85 },
  { color: SUGGESTION_GREEN, strokeWidth: 13, opacity: 0.6 },
  { color: SUGGESTION_GREEN, strokeWidth: 8, opacity: 0.35 },
] as const

// Quantos lances de cada linha do motor mostrar como texto no painel "Motor" (prévia curta,
// não a variante inteira) — mesmo princípio do chess.com/analysis: mostrar as N melhores
// linhas como texto, não só como seta no tabuleiro (ver matriz de referências, Fase 3).
const PV_PREVIEW_PLIES = 4

// Mesma formatação da etiqueta da barra de avaliação (EvalBar.tsx), reaproveitada aqui pra cada
// linha do motor — `line.cp`/`.mate` já vêm relativos às brancas (useStockfish.ts converte na
// hora, usando o lado a jogar de quando a busca foi pedida, não precisa de `sideToMove` aqui).
function formatLineEval(line: StockfishEval): string {
  if (line.mate !== null) return `#${Math.abs(line.mate)}`
  const whiteCp = line.cp ?? 0
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

/**
 * Tabuleiro de análise livre — posição inicial, todas as peças no lugar, joga dos dois lados
 * (sem PGN carregado, diferente da tela de "Analisar" que revê uma partida já pronta). O
 * Stockfish avalia a posição atual em tempo real a cada lance, com a mesma barra de avaliação
 * e tabuleiro interativo já usados no resto do app. Mesmo layout de coluna central + painel
 * lateral das outras telas (Review/Treino), pra manter a sensação de "mesmo app".
 */
export function AnalysisBoardView({ boardWidth, containerRef, initialFen }: AnalysisBoardViewProps) {
  const {
    currentFen, currentMoveIndex, moves, lastMove,
    boardOrientation, flipBoard,
    makeMove, updateMoveClassification, goToMove, goFirst, goPrev, goNext, goLast, reset,
  } = useAnalysisBoard(initialFen)

  // multiPv=3 pede as 3 melhores linhas ao engine (não só a melhor) — é isso que alimenta as
  // 3 setas de sugestão. `evaluation` continua sendo só a linha 1 (pra barra de avaliação).
  // Profundidade 18 (era 15, pedido direto do usuário — "quero stockfish melhor").
  const { evaluation, lines, isReady, isAnalyzing, analyze } = useStockfish(18, 3)

  // Qual FEN o pedido de análise em andamento é sobre — junto com `lastEvalRef` (a última
  // avaliação que de fato chegou), dá pra saber com segurança se um resultado novo é "antes" ou
  // "depois" de um lance, sem precisar de um segundo motor rodando em paralelo.
  const requestedFenRef = useRef('')
  const lastEvalRef = useRef<{ fen: string; cp: number | null; mate: number | null; bestMove: string | null } | null>(null)
  // Lance que acabou de ser jogado, esperando a avaliação do Stockfish pra depois dele chegar —
  // só então dá pra saber quanto a posição caiu (ou não) e classificar (bom/erro/imprecisão/etc).
  const pendingClassifyRef = useRef<{
    moveIndex: number; color: 'w' | 'b'; from: string; to: string
    fenBefore: string; fenAfter: string; beforeCp: number | null; beforeMate: number | null; bestMoveBefore: string | null
  } | null>(null)

  useEffect(() => {
    if (isReady) {
      analyze(currentFen)
      requestedFenRef.current = currentFen
    }
  }, [currentFen, isReady, analyze])

  // Resolve a classificação pendente assim que a avaliação da posição "depois" do lance chega —
  // e também guarda toda avaliação que chega como referência (o "antes" do PRÓXIMO lance).
  useEffect(() => {
    const line: StockfishEval | null = lines[0]
    if (!line) return
    const forFen = requestedFenRef.current
    lastEvalRef.current = { fen: forFen, cp: line.cp, mate: line.mate, bestMove: line.bestMove }

    const pending = pendingClassifyRef.current
    if (!pending || forFen !== pending.fenAfter) return
    // A partida pode ter sido reiniciada nesse meio-tempo — o índice não existe mais.
    if (!moves[pending.moveIndex]) { pendingClassifyRef.current = null; return }

    // `pending.beforeCp/beforeMate` e `line.cp/line.mate` já vêm relativos às brancas (conversão
    // feita dentro de `useStockfish.ts`) — `toWhiteCp` aqui só colapsa mate num valor e satura o
    // range, não precisa (nem deve) inverter sinal de novo, então sempre 'w'.
    const evalBefore = toWhiteCp(pending.beforeCp, pending.beforeMate, 'w')
    const evalAfter = toWhiteCp(line.cp, line.mate, 'w')
    const isBest = !!pending.bestMoveBefore && pending.from + pending.to === pending.bestMoveBefore.slice(0, 4)
    const isBook = isBookMove(moves.slice(0, pending.moveIndex + 1).map((m) => m.san))
    const materialDelta = materialForSide(pending.fenBefore, pending.color) - materialForSide(pending.fenAfter, pending.color)
    const classification: MoveQuality = classifyMove(evalBefore, evalAfter, pending.color, isBest, isBook, materialDelta)

    updateMoveClassification(pending.moveIndex, classification)
    pendingClassifyRef.current = null
  }, [lines, moves, updateMoveClassification])

  const topMoveArrows = useMemo(() => {
    const arrows: { from: string; to: string; color: string; strokeWidth: number; opacity: number }[] = []
    const seen = new Set<string>() // duas linhas raramente sugerem o mesmo lance, mas evita seta duplicada
    lines.forEach((line, i) => {
      const style = SUGGESTION_STYLE[i]
      if (!style || !line?.bestMove || line.bestMove.length < 4) return
      const from = line.bestMove.slice(0, 2)
      const to = line.bestMove.slice(2, 4)
      const key = from + to
      if (seen.has(key)) return
      seen.add(key)
      arrows.push({ from, to, color: style.color, strokeWidth: style.strokeWidth, opacity: style.opacity })
    })
    return arrows
  }, [lines])

  const opening = useMemo(() => {
    if (moves.length === 0) return null
    const match = identifyOpening(moves.map((m) => m.san))
    return match ? `${match.eco} · ${match.name}` : null
  }, [moves])

  // Prévia em SAN das 3 linhas do motor (texto, complementando as setas de sugestão no
  // tabuleiro) — princípio observado no chess.com/analysis (ver matriz de referências, Fase 3).
  const enginePreviews = useMemo(
    () => lines.map((line) => (line ? pvToSan(currentFen, line.pv, PV_PREVIEW_PLIES) : [])),
    [lines, currentFen],
  )

  const turn = currentFen.split(' ')[1] === 'b' ? 'Pretas' : 'Brancas'
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH
  const rows = Math.ceil(moves.length / 2)
  const currentQuality = currentMoveIndex >= 0 ? moves[currentMoveIndex]?.classification ?? null : null

  function handleDrop(sourceSquare: string, targetSquare: string, promotion?: string): boolean {
    const fenBefore = currentFen
    const color = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w'
    // Só dá pra classificar se já tínhamos uma avaliação de referência PARA ESSA posição exata
    // (senão não tem "antes" pra comparar) — jogar rápido demais, antes do motor terminar a
    // posição anterior, só faz esse lance específico ficar sem selo, sem quebrar nada.
    const before = lastEvalRef.current?.fen === fenBefore ? lastEvalRef.current : null
    const moveIndex = currentMoveIndex + 1

    const fenAfter = makeMove(sourceSquare, targetSquare, promotion)
    if (!fenAfter) return false

    if (before) {
      pendingClassifyRef.current = {
        moveIndex, color, from: sourceSquare, to: targetSquare,
        fenBefore, fenAfter,
        beforeCp: before.cp, beforeMate: before.mate, bestMoveBefore: before.bestMove,
      }
    }
    return true
  }

  return (
    <>
      {/* Center — mesma coluna do tabuleiro de análise/treino */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth }}>
          <TurnCard turn={turn} isCheck={/\+|#$/.test(moves[currentMoveIndex]?.san ?? '')} />
        </div>

        <ChessBoard
          fen={currentFen}
          lastMove={lastMove}
          evaluation={evaluation}
          boardWidth={boardWidth}
          interactive
          boardOrientation={boardOrientation}
          topMoveArrows={topMoveArrows}
          currentQuality={currentQuality}
          onPieceDrop={({ sourceSquare, targetSquare, promotion }) => (targetSquare ? handleDrop(sourceSquare, targetSquare, promotion) : false)}
        />

        <div style={{ width: cardWidth }}>
          <BoardControls
            isLoaded={moves.length > 0}
            currentMoveIndex={currentMoveIndex}
            totalMoves={moves.length}
            onFirst={goFirst}
            onPrev={goPrev}
            onNext={goNext}
            onLast={goLast}
            onFlip={flipBoard}
          />
        </div>
      </div>

      {/* Right — mesma posição/largura do painel de análise/treino */}
      <aside className="cl-tool-aside">
        <div className="cl-tool-aside-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          <button
            onClick={reset}
            className="cl-btn cl-btn-sm"
            style={{ width: 'auto', height: 'auto', alignSelf: 'flex-end', padding: '6px 10px', fontSize: 10.5 }}
            title="Recomeçar do zero"
          >
            Nova partida
          </button>

          <EnginePanel lines={lines} previews={enginePreviews} isAnalyzing={isAnalyzing} />

          {opening && (
            <div style={{
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abertura</span>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-on-dark)', lineHeight: 1.4 }}>{opening}</p>
            </div>
          )}

          <div className="cl-card" style={{ padding: 14 }}>
            {moves.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
                Arraste (ou clique) numa peça pra começar a jogar — a avaliação do Stockfish atualiza a cada lance.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Array.from({ length: rows }, (_, i) => {
                  const wIdx = i * 2
                  const bIdx = i * 2 + 1
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr 1fr', alignItems: 'center', gap: 6,
                      padding: '4px 4px', borderRadius: 'var(--radius-sm)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                    }}>
                      <span className="cl-mono" style={{ fontSize: 12.5, textAlign: 'center', color: 'var(--color-gray-muted)', fontWeight: 700 }}>{i + 1}</span>
                      <MoveCell move={moves[wIdx]} active={currentMoveIndex === wIdx} onClick={() => goToMove(wIdx)} />
                      {moves[bIdx] ? (
                        <MoveCell move={moves[bIdx]} active={currentMoveIndex === bIdx} onClick={() => goToMove(bIdx)} />
                      ) : <span />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

/** Painel do motor — mostra as até 3 melhores linhas como texto (eval + prévia de lances) e o
 *  estado calculando/parado, complementando as setas de sugestão no tabuleiro (não substituem
 *  — algumas pessoas preferem ler a linha, outras preferem só ver a seta). Ver Fase 3 do
 *  redesign (matriz de referências: chess.com mostra as linhas como texto; Lichess deixa claro
 *  quando o motor está calculando ou parado). */
function EnginePanel({
  lines, previews, isAnalyzing,
}: {
  lines: (StockfishEval | null)[]
  previews: string[][]
  isAnalyzing: boolean
}) {
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
        // uma posição com poucos lances legais, ou o instante logo após trocar de posição (as
        // linhas antigas somem antes das novas chegarem), fazia o painel "piscar" de 3 pra 1-2
        // linhas e voltar. Placeholder cinza ocupa o lugar da linha que ainda não chegou, pra
        // altura do painel ficar estável.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, opacity: line ? (i === 0 ? 1 : 0.65) : 0.35 }}>
              <span className="cl-mono" style={{
                fontSize: 12, fontWeight: 800, minWidth: 36, flexShrink: 0,
                color: i === 0 ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)',
              }}>
                {line ? formatLineEval(line) : '···'}
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

function TurnCard({ turn, isCheck }: { turn: string; isCheck: boolean }) {
  return (
    <div className="cl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 14px' }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>
        Vez das <span style={{ color: 'var(--color-blue-bright)' }}>{turn}</span>
      </span>
      {isCheck && (
        <span style={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-error)', color: '#fff',
        }}>
          Xeque
        </span>
      )}
    </div>
  )
}

function MoveCell({ move, active, onClick }: { move?: PlayedMove; active: boolean; onClick: () => void }) {
  if (!move) return <span />
  return (
    <button
      onClick={onClick}
      className={`cl-move-btn flex items-center gap-2 px-2.5 py-1.5 text-sm text-left w-full ${active ? 'cl-move-active' : ''}`}
      style={{ borderRadius: 'var(--radius-sm)', fontWeight: active ? 700 : 400, transition: 'background-color var(--dur-tap) var(--ease-tap), color var(--dur-tap) var(--ease-tap)' }}
    >
      {move.san}
      {move.classification && <MoveQualityBadge quality={move.classification} size="sm" />}
    </button>
  )
}
