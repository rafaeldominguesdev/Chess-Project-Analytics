import { useState, useCallback } from 'react'
import { Chess } from 'chess.js'
import type { ClassifiedMove, GameInfo } from '../types/chess.types'
import type { MoveQuality } from '../utils/moveClassifier'
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
  lastMove: { from: string; to: string } | null
  updateMoveClassification: (index: number, classification: MoveQuality, evalBefore: number | null, evalAfter: number | null, bestMove: string | null) => void
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function extractGameInfo(game: Chess): GameInfo {
  const h = game.header()
  return {
    white: h['White'] ?? 'Brancas',
    black: h['Black'] ?? 'Pretas',
    whiteElo: h['WhiteElo'] ?? '?',
    blackElo: h['BlackElo'] ?? '?',
    result: h['Result'] ?? '*',
    date: h['Date'] ?? '?',
    event: h['Event'] ?? '?',
    opening: h['Opening'] ?? '',
    eco: h['ECO'] ?? '',
    termination: h['Termination'] ?? '',
  }
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
      const game = new Chess()
      game.loadPgn(pgn)
      const info = extractGameInfo(game)
      const history = game.history({ verbose: true })

      const fenList: string[] = [INITIAL_FEN]
      const classifiedMoves: ClassifiedMove[] = []
      const temp = new Chess()

      history.forEach((move, i) => {
        temp.move(move.san)
        fenList.push(temp.fen())
        classifiedMoves.push({
          san: move.san,
          from: move.from,
          to: move.to,
          fen: temp.fen(),
          moveNumber: Math.floor(i / 2) + 1,
          color: move.color as 'w' | 'b',
          classification: null,
          evalBefore: null,
          evalAfter: null,
          bestMove: null,
        })
      })

      setFens(fenList)
      setMoves(classifiedMoves)
      setGameInfo(info)
      setCurrentMoveIndex(-1)
      setIsLoaded(true)
    } catch {
      throw new Error('PGN inválido. Verifique o formato e tente novamente.')
    }
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
    goToMove, goFirst, goPrev, goNext, goLast, loadPgn, lastMove,
    updateMoveClassification,
  }
}
