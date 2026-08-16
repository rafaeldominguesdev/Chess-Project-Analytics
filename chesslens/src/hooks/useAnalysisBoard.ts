import { useCallback, useState } from 'react'
import { Chess } from 'chess.js'
import { useMoveSound } from './useMoveSound'
import type { MoveQuality } from '../utils/moveClassifier'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export interface PlayedMove {
  san: string
  from: string
  to: string
  color: 'w' | 'b'
  /** Preenchida de fora (ver AnalysisBoardView) depois que o Stockfish avalia antes/depois do lance. */
  classification: MoveQuality | null
}

/**
 * Tabuleiro de análise livre: começa na posição inicial (todas as peças no lugar) e deixa jogar
 * lance a lance dos dois lados, sem PGN nenhum carregado — diferente de `useChessGame`, que só
 * reproduz uma partida já pronta. Segue a mesma convenção de índice de `useChessGame`
 * (`currentMoveIndex === -1` é a posição inicial) pra poder reusar `BoardControls` sem alterações.
 * Navegar pra trás e jogar um lance novo dali descarta o "futuro" da linha atual (sem ramificação —
 * como o tabuleiro de análise do lichess/chess.com quando você não guarda a variante).
 */
export function useAnalysisBoard() {
  const [fens, setFens] = useState<string[]>([INITIAL_FEN])
  const [moves, setMoves] = useState<PlayedMove[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const { playForSan } = useMoveSound()

  const currentFen = fens[currentMoveIndex + 1] ?? INITIAL_FEN
  const lastMove = currentMoveIndex >= 0 && moves[currentMoveIndex]
    ? { from: moves[currentMoveIndex].from, to: moves[currentMoveIndex].to }
    : null

  // Retorna o FEN resultante (pra quem chama saber a posição exata do lance sem ter que
  // recalcular com chess.js de novo) — `false` quando o lance é ilegal.
  const makeMove = useCallback((from: string, to: string): string | false => {
    const chess = new Chess(fens[currentMoveIndex + 1] ?? INITIAL_FEN)
    let result: ReturnType<Chess['move']>
    try {
      // Sem tela de escolha de peça — promove pra dama sempre (mesma simplificação do treino de táticas).
      result = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false // lance ilegal — o tabuleiro desfaz o arraste sozinho
    }
    if (!result) return false

    const newFen = chess.fen()
    // Jogar a partir de um ponto navegado pra trás descarta o que vinha depois.
    setFens((prev) => [...prev.slice(0, currentMoveIndex + 2), newFen])
    setMoves((prev) => [
      ...prev.slice(0, currentMoveIndex + 1),
      { san: result.san, from: result.from, to: result.to, color: result.color as 'w' | 'b', classification: null },
    ])
    setCurrentMoveIndex((i) => i + 1)
    playForSan(result.san)
    return newFen
  }, [fens, currentMoveIndex, playForSan])

  const updateMoveClassification = useCallback((index: number, classification: MoveQuality) => {
    setMoves((prev) => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = { ...next[index], classification }
      return next
    })
  }, [])

  const goToMove = useCallback((index: number) => setCurrentMoveIndex(index), [])
  const goFirst = useCallback(() => setCurrentMoveIndex(-1), [])
  const goPrev = useCallback(() => setCurrentMoveIndex((i) => Math.max(-1, i - 1)), [])
  const goNext = useCallback(() => setCurrentMoveIndex((i) => Math.min(fens.length - 2, i + 1)), [fens.length])
  const goLast = useCallback(() => setCurrentMoveIndex(fens.length - 2), [fens.length])

  const reset = useCallback(() => {
    setFens([INITIAL_FEN])
    setMoves([])
    setCurrentMoveIndex(-1)
  }, [])

  const flipBoard = useCallback(() => {
    setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))
  }, [])

  return {
    currentFen, currentMoveIndex, moves, lastMove,
    boardOrientation, flipBoard,
    makeMove, updateMoveClassification, goToMove, goFirst, goPrev, goNext, goLast, reset,
  }
}
