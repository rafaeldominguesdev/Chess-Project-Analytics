import { useState, useCallback } from 'react'
import type { ClassifiedMove } from '../analysis/types'
import type { GameInfo } from '../types/chess.types'
import type { MoveQuality } from '../analysis/moveClassifier'
import { parsePgn, INITIAL_FEN } from '../analysis/pgnParser'
// MoveQuality is used for updateMoveClassification

interface UseChessGameReturn {
  currentFen: string
  currentMoveIndex: number
  moves: ClassifiedMove[]
  fens: string[]
  gameInfo: GameInfo | null
  isLoaded: boolean
  goToMove: (index: number) => void
  goFirst: () => void
  goPrev: () => void
  goNext: () => void
  goLast: () => void
  loadPgn: (pgn: string) => void
  unloadGame: () => void
  lastMove: { from: string; to: string } | null
  updateMoveClassification: (index: number, classification: MoveQuality, evalBefore: number | null, evalAfter: number | null, bestMove: string | null) => void
}

export function useChessGame(): UseChessGameReturn {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [moves, setMoves] = useState<ClassifiedMove[]>([])
  const [fens, setFens] = useState<string[]>([INITIAL_FEN])
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const currentFen = fens[currentMoveIndex + 1] ?? INITIAL_FEN
  const lastMove = currentMoveIndex >= 0 && moves[currentMoveIndex]
    ? { from: moves[currentMoveIndex].from, to: moves[currentMoveIndex].to }
    : null

  const loadPgn = useCallback((pgn: string) => {
    try {
      const { fens: fenList, moves: classifiedMoves, gameInfo: info } = parsePgn(pgn)
      setFens(fenList)
      setMoves(classifiedMoves)
      setGameInfo(info)
      setCurrentMoveIndex(-1)
      setIsLoaded(true)
    } catch {
      throw new Error('PGN inválido. Verifique o formato e tente novamente.')
    }
  }, [])

  // Volta pro estado "nenhuma partida carregada" (tela de Analisar/busca) sem precisar recarregar
  // a página — usado pelo botão "Analisar" da sidebar e pelo logo, mesmo com uma partida aberta.
  const unloadGame = useCallback(() => {
    setFens([INITIAL_FEN])
    setMoves([])
    setGameInfo(null)
    setCurrentMoveIndex(-1)
    setIsLoaded(false)
  }, [])

  const updateMoveClassification = useCallback((
    index: number,
    classification: MoveQuality,
    evalBefore: number | null,
    evalAfter: number | null,
    bestMove: string | null,
  ) => {
    setMoves((prev) => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = { ...next[index], classification, evalBefore, evalAfter, bestMove }
      return next
    })
  }, [])

  const goToMove = useCallback((index: number) => setCurrentMoveIndex(index), [])
  const goFirst = useCallback(() => setCurrentMoveIndex(-1), [])
  const goPrev = useCallback(() => setCurrentMoveIndex((i) => Math.max(-1, i - 1)), [])
  const goNext = useCallback(() => setCurrentMoveIndex((i) => Math.min(fens.length - 2, i + 1)), [fens.length])
  const goLast = useCallback(() => setCurrentMoveIndex(fens.length - 2), [fens.length])

  return {
    currentFen, currentMoveIndex, moves, fens, gameInfo, isLoaded,
    goToMove, goFirst, goPrev, goNext, goLast, loadPgn, unloadGame, lastMove,
    updateMoveClassification,
  }
}
