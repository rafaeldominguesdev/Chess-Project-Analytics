import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { getRandomPuzzle } from '../utils/puzzles'
import type { Puzzle } from '../utils/puzzles'
import { useMoveSound } from './useMoveSound'

// 'solving' → tabuleiro visível e interativo, esperando o lance certo.
// 'wrong'   → último lance tentado estava errado (já desfeito); espera o clique em "Tentar de novo".
// 'correct' → lance certo aceito, aguardando a resposta automática do adversário tocar.
// 'solved'  → sequência inteira resolvida.
// 'empty'   → não achou nenhum puzzle na faixa de rating escolhida.
export type PuzzleStatus = 'solving' | 'correct' | 'wrong' | 'solved' | 'empty'

interface RatingRange {
  min: number
  max: number
}

function uciToMoveObj(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

/**
 * Estado + lógica de um treinador de táticas: carrega um puzzle aleatório dentro da faixa de
 * rating escolhida, aplica o lance de "preparo" automaticamente, e valida cada lance do usuário
 * contra a sequência solução — lance certo avança (e toca a resposta forçada do adversário
 * sozinho), lance errado desfaz e espera o usuário confirmar antes de deixar tentar de novo.
 */
export function usePuzzleTrainer(initialRange: RatingRange = { min: 1500, max: 1700 }) {
  const [ratingRange, setRatingRange] = useState<RatingRange>(initialRange)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [status, setStatus] = useState<PuzzleStatus>('solving')
  const [solverColor, setSolverColor] = useState<'white' | 'black'>('white')
  const [solvedCount, setSolvedCount] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintSquare, setHintSquare] = useState<string | null>(null)

  const { playForSan, play } = useMoveSound()

  const chessRef = useRef(new Chess())
  const solutionIndexRef = useRef(1)
  const solvedIdsRef = useRef(new Set<string>())
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const loadPuzzle = useCallback(() => {
    clearTimeout(replyTimerRef.current)
    setWrongAttempts(0)
    setHintSquare(null)

    const next = getRandomPuzzle(ratingRange.min, ratingRange.max, solvedIdsRef.current)
    if (!next) {
      setPuzzle(null)
      setStatus('empty')
      return
    }

    const chess = new Chess(next.fen)
    const setupMove = chess.move(uciToMoveObj(next.moves[0]))
    chessRef.current = chess
    solutionIndexRef.current = 1

    setPuzzle(next)
    setFen(chess.fen())
    setLastMove({ from: setupMove.from, to: setupMove.to })
    setSolverColor(chess.turn() === 'w' ? 'white' : 'black')
    setStatus('solving')
    playForSan(setupMove.san)
  }, [ratingRange, playForSan])

  useEffect(() => {
    loadPuzzle()
    return () => clearTimeout(replyTimerRef.current)
  }, [loadPuzzle])

  const retryPuzzle = useCallback(() => {
    setHintSquare(null)
    setStatus((s) => (s === 'wrong' ? 'solving' : s))
  }, [])

  const showHint = useCallback(() => {
    if (!puzzle || status !== 'solving') return
    setHintSquare(puzzle.moves[solutionIndexRef.current].slice(0, 2))
  }, [puzzle, status])

  const attemptMove = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    if (!puzzle || status !== 'solving') return false

    const chess = chessRef.current
    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch {
      return false // lance ilegal — o tabuleiro volta a peça sozinho
    }

    const playedUci = result.from + result.to + (result.promotion ?? '')
    const expectedUci = puzzle.moves[solutionIndexRef.current]

    if (playedUci !== expectedUci) {
      chess.undo()
      setWrongAttempts((n) => n + 1)
      setStatus('wrong')
      play('error')
      return false
    }

    setHintSquare(null)
    solutionIndexRef.current++
    setFen(chess.fen())
    setLastMove({ from: result.from, to: result.to })
    playForSan(result.san)

    if (solutionIndexRef.current >= puzzle.moves.length) {
      setStatus('solved')
      setSolvedCount((c) => c + 1)
      solvedIdsRef.current.add(puzzle.id)
      play('victory')
      return true
    }

    setStatus('correct')
    const replyUci = puzzle.moves[solutionIndexRef.current]
    replyTimerRef.current = setTimeout(() => {
      try {
        const reply = chess.move(uciToMoveObj(replyUci))
        solutionIndexRef.current++
        setFen(chess.fen())
        setLastMove({ from: reply.from, to: reply.to })
        playForSan(reply.san)
        const finished = solutionIndexRef.current >= puzzle.moves.length
        setStatus(finished ? 'solved' : 'solving')
        if (finished) {
          setSolvedCount((c) => c + 1)
          solvedIdsRef.current.add(puzzle.id)
          play('victory')
        }
      } catch {
        setStatus('solving')
      }
    }, 400)

    return true
  }, [puzzle, status, playForSan, play])

  return {
    puzzle, fen, lastMove, status, solverColor, hintSquare,
    ratingRange, setRatingRange,
    solvedCount, wrongAttempts,
    attemptMove, nextPuzzle: loadPuzzle, retryPuzzle, showHint,
  }
}
