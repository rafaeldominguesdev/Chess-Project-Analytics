import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { getDailyPuzzle, dayKey } from '../analysis/dailyPuzzle'
import type { DailyPuzzle } from '../analysis/dailyPuzzle'
import { useMoveSound } from './useMoveSound'

const PROGRESS_KEY = 'chessnoir-daily-puzzle'

// 'solving' → tabuleiro interativo, esperando o lance certo.
// 'wrong'   → último lance errado (já desfeito); espera "Tentar de novo".
// 'correct' → lance certo aceito, aguardando a resposta forçada tocar.
// 'solved'  → sequência resolvida (hoje).
export type DailyStatus = 'solving' | 'correct' | 'wrong' | 'solved'

interface DailyProgress {
  /** `YYYY-MM-DD` local do último dia concluído. */
  lastCompletedDate: string | null
  /** Dias seguidos concluídos (conta hoje quando `lastCompletedDate === hoje`). */
  streak: number
  /** Maior sequência já feita. */
  best: number
  /** Total de puzzles diários resolvidos. */
  totalSolved: number
}

const EMPTY_PROGRESS: DailyProgress = { lastCompletedDate: null, streak: 0, best: 0, totalSolved: 0 }

function loadProgress(): DailyProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { ...EMPTY_PROGRESS }
    const parsed = JSON.parse(raw) as Partial<DailyProgress>
    return {
      lastCompletedDate: parsed.lastCompletedDate ?? null,
      streak: parsed.streak ?? 0,
      best: parsed.best ?? 0,
      totalSolved: parsed.totalSolved ?? 0,
    }
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

function saveProgress(p: DailyProgress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {
    // persistência opcional — nunca quebra o app
  }
}

function isYesterday(dateStr: string, today: Date): boolean {
  const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  return dateStr === dayKey(y)
}

function uciToMoveObj(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

/**
 * Estado + lógica do Puzzle Diário: carrega o puzzle determinístico de hoje (mesmo pra todos,
 * não repete até o banco esgotar — ver `analysis/dailyPuzzle.ts`), aplica o lance de preparo e
 * valida cada lance contra a solução. Guarda no `localStorage` o dia concluído, a sequência de
 * dias seguidos (streak) e o total — se hoje já foi resolvido, abre direto em `solved`.
 */
export function useDailyPuzzle() {
  const daily: DailyPuzzle = useMemo(() => getDailyPuzzle(), [])
  const { puzzle } = daily

  const [progress, setProgress] = useState<DailyProgress>(loadProgress)
  const alreadyDoneToday = progress.lastCompletedDate === daily.date

  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [status, setStatus] = useState<DailyStatus>(alreadyDoneToday ? 'solved' : 'solving')
  const [solverColor, setSolverColor] = useState<'white' | 'black'>('white')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [usedHint, setUsedHint] = useState(false)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)

  const { playForSan, play } = useMoveSound()

  const chessRef = useRef(new Chess())
  const solutionIndexRef = useRef(1)
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Monta a posição inicial (FEN + lance de preparo). Roda uma vez — o puzzle do dia é fixo.
  useEffect(() => {
    const chess = new Chess(puzzle.fen)
    const setup = chess.move(uciToMoveObj(puzzle.moves[0]))
    chessRef.current = chess
    solutionIndexRef.current = 1
    setFen(chess.fen())
    setLastMove({ from: setup.from, to: setup.to })
    setSolverColor(chess.turn() === 'w' ? 'white' : 'black')
    if (!alreadyDoneToday) playForSan(setup.san)
    return () => {
      clearTimeout(replyTimerRef.current)
      clearTimeout(hintTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle])

  const markSolvedToday = useCallback(() => {
    setProgress((prev) => {
      if (prev.lastCompletedDate === daily.date) return prev
      const today = new Date()
      const continues = prev.lastCompletedDate && isYesterday(prev.lastCompletedDate, today)
      const streak = continues ? prev.streak + 1 : 1
      const next: DailyProgress = {
        lastCompletedDate: daily.date,
        streak,
        best: Math.max(prev.best, streak),
        totalSolved: prev.totalSolved + 1,
      }
      saveProgress(next)
      return next
    })
  }, [daily.date])

  const advanceWithSolutionMove = useCallback((result: { from: string; to: string; san: string }) => {
    setHintSquare(null)
    setHintMove(null)
    solutionIndexRef.current++
    setFen(chessRef.current.fen())
    setLastMove({ from: result.from, to: result.to })
    playForSan(result.san)

    if (solutionIndexRef.current >= puzzle.moves.length) {
      setStatus('solved')
      play('victory')
      markSolvedToday()
      return
    }

    setStatus('correct')
    const replyUci = puzzle.moves[solutionIndexRef.current]
    replyTimerRef.current = setTimeout(() => {
      try {
        const reply = chessRef.current.move(uciToMoveObj(replyUci))
        solutionIndexRef.current++
        setFen(chessRef.current.fen())
        setLastMove({ from: reply.from, to: reply.to })
        playForSan(reply.san)
        const finished = solutionIndexRef.current >= puzzle.moves.length
        setStatus(finished ? 'solved' : 'solving')
        if (finished) {
          play('victory')
          markSolvedToday()
        }
      } catch {
        setStatus('solving')
      }
    }, 400)
  }, [puzzle, playForSan, play, markSolvedToday])

  const attemptMove = useCallback((sourceSquare: string, targetSquare: string, promotion?: string): boolean => {
    if (status !== 'solving') return false
    clearTimeout(hintTimerRef.current)
    const chess = chessRef.current
    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion ?? 'q' })
    } catch {
      return false
    }
    const playedUci = result.from + result.to + (result.promotion ?? '')
    if (playedUci !== puzzle.moves[solutionIndexRef.current]) {
      chess.undo()
      setWrongAttempts((n) => n + 1)
      setStatus('wrong')
      play('error')
      return false
    }
    advanceWithSolutionMove(result)
    return true
  }, [status, puzzle, play, advanceWithSolutionMove])

  const retry = useCallback(() => {
    clearTimeout(hintTimerRef.current)
    setHintSquare(null)
    setHintMove(null)
    setStatus((s) => (s === 'wrong' ? 'solving' : s))
  }, [])

  const showPieceHint = useCallback(() => {
    if (status !== 'solving') return
    setUsedHint(true)
    setHintSquare(puzzle.moves[solutionIndexRef.current].slice(0, 2))
  }, [status, puzzle])

  const showMoveHint = useCallback(() => {
    if (status !== 'solving') return
    setUsedHint(true)
    const uci = puzzle.moves[solutionIndexRef.current]
    setHintSquare(null)
    setHintMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) })
    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      let result: ReturnType<Chess['move']>
      try {
        result = chessRef.current.move(uciToMoveObj(uci))
      } catch {
        return
      }
      advanceWithSolutionMove(result)
    }, 1000)
  }, [status, puzzle, advanceWithSolutionMove])

  return {
    daily, fen, lastMove, status, solverColor,
    wrongAttempts, usedHint, hintSquare, hintMove,
    alreadyDoneToday,
    streak: progress.streak,
    best: progress.best,
    totalSolved: progress.totalSolved,
    attemptMove, retry, showPieceHint, showMoveHint,
  }
}
