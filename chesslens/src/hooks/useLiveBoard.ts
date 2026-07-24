import { useState, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export interface LiveMove {
  from: string
  to: string
  san: string
  color: 'w' | 'b'
}

/**
 * Tabuleiro "vivo": aceita lances (validados por chess.js), desfaz e reinicia a
 * partir de qualquer FEN. Usado nos modos treino, jogar e editor.
 */
export function useLiveBoard(initialFen: string = START_FEN) {
  const game = useRef(new Chess(initialFen))
  const [fen, setFen] = useState(game.current.fen())
  const [history, setHistory] = useState<LiveMove[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  const sync = useCallback(() => {
    setFen(game.current.fen())
    const h = game.current.history({ verbose: true })
    setHistory(h.map((m) => ({ from: m.from, to: m.to, san: m.san, color: m.color as 'w' | 'b' })))
    const last = h[h.length - 1]
    setLastMove(last ? { from: last.from, to: last.to } : null)
  }, [])

  const move = useCallback((from: string, to: string, promotion = 'q'): LiveMove | null => {
    try {
      const m = game.current.move({ from, to, promotion })
      if (!m) return null
      sync()
      return { from: m.from, to: m.to, san: m.san, color: m.color as 'w' | 'b' }
    } catch {
      return null
    }
  }, [sync])

  const undo = useCallback(() => {
    game.current.undo()
    sync()
  }, [sync])

  const reset = useCallback((fenStr: string = START_FEN) => {
    try {
      game.current = new Chess(fenStr)
    } catch {
      game.current = new Chess(START_FEN)
    }
    sync()
  }, [sync])

  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w'

  return {
    fen,
    turn: turn as 'w' | 'b',
    history,
    lastMove,
    move,
    undo,
    reset,
    isGameOver: () => game.current.isGameOver(),
    isCheckmate: () => game.current.isCheckmate(),
    isDraw: () => game.current.isDraw(),
    getChess: () => game.current,
  }
}
