import { useState, useEffect, useRef, useCallback } from 'react'

interface ChessClockState {
  whiteMs: number
  blackMs: number
  flagged: 'w' | 'b' | null
  reset: () => void
}

/**
 * Relógio de xadrez real (contagem regressiva). Decrementa só o lado que
 * está pra jogar (`turn`), para de vez quando `gameOver` ou quando um lado
 * zera o tempo (flagged) — nesse caso o próprio hook marca o fim de jogo.
 */
export function useChessClock(turn: 'w' | 'b', gameOver: boolean, initialMs = 600_000): ChessClockState {
  const [whiteMs, setWhiteMs] = useState(initialMs)
  const [blackMs, setBlackMs] = useState(initialMs)
  const [flagged, setFlagged] = useState<'w' | 'b' | null>(null)
  const lastTickRef = useRef(Date.now())

  useEffect(() => {
    if (gameOver || flagged) return

    lastTickRef.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastTickRef.current
      lastTickRef.current = now

      if (turn === 'w') {
        setWhiteMs((ms) => {
          const next = Math.max(0, ms - elapsed)
          if (next === 0) setFlagged('w')
          return next
        })
      } else {
        setBlackMs((ms) => {
          const next = Math.max(0, ms - elapsed)
          if (next === 0) setFlagged('b')
          return next
        })
      }
    }, 100)

    return () => clearInterval(id)
  }, [turn, gameOver, flagged])

  const reset = useCallback(() => {
    setWhiteMs(initialMs)
    setBlackMs(initialMs)
    setFlagged(null)
  }, [initialMs])

  return { whiteMs, blackMs, flagged, reset }
}
