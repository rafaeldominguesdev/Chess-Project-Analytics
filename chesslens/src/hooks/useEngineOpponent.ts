import { useRef, useEffect, useCallback } from 'react'

const ENGINE_URL = '/stockfish/stockfish-18-lite-single.js'

/**
 * Oponente Stockfish para o modo "jogar". O worker é criado sob demanda
 * (só quando o primeiro lance é pedido) e reaproveitado depois.
 */
export function useEngineOpponent() {
  const worker = useRef<Worker | null>(null)
  const ready = useRef(false)
  const resolveRef = useRef<((bm: string | null) => void) | null>(null)

  const ensureWorker = useCallback(() => {
    if (worker.current) return
    const w = new Worker(ENGINE_URL)
    worker.current = w
    w.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      if (line === 'uciok') { w.postMessage('setoption name Hash value 32'); w.postMessage('isready'); return }
      if (line === 'readyok') { ready.current = true; return }
      if (line.startsWith('bestmove')) {
        const bm = line.split(' ')[1]
        resolveRef.current?.(bm && bm !== '(none)' ? bm : null)
        resolveRef.current = null
      }
    }
    w.postMessage('uci')
  }, [])

  useEffect(() => () => { worker.current?.terminate() }, [])

  /** Retorna o melhor lance UCI (ex "e2e4") para o FEN, pensando por `movetimeMs`. */
  const bestMove = useCallback(async (fen: string, movetimeMs = 600): Promise<string | null> => {
    ensureWorker()
    let waited = 0
    while (!ready.current && waited < 8000) { await new Promise((r) => setTimeout(r, 100)); waited += 100 }
    if (!worker.current) return null
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve
      worker.current!.postMessage('position fen ' + fen)
      worker.current!.postMessage('go movetime ' + movetimeMs)
    })
  }, [ensureWorker])

  return { bestMove }
}
