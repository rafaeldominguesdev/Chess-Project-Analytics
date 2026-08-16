import { useEffect, useRef, useState, useCallback } from 'react'

export interface PositionEval {
  cp: number | null
  mate: number | null
  bestMove: string | null
}

// Mesmo build completo (NNUE cheia) usado pela avaliação ao vivo — mantém as duas
// análises consistentes entre si e com o que o chess.com mostra.
const ENGINE_URL = '/stockfish/stockfish-18-single.js'

/**
 * Analisa a partida inteira posição por posição num worker Stockfish dedicado.
 * Usa profundidade menor (rápida) e é cancelável quando uma nova partida carrega.
 */
export function useGameAnalysis(depth = 12) {
  const worker = useRef<Worker | null>(null)
  const readyRef = useRef(false)
  const latest = useRef<PositionEval>({ cp: null, mate: null, bestMove: null })
  const resolveRef = useRef<((e: PositionEval) => void) | null>(null)
  const runId = useRef(0)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let w: Worker
    try { w = new Worker(ENGINE_URL) } catch { return }
    worker.current = w

    w.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      if (line === 'uciok') {
        w.postMessage('setoption name Hash value 64')
        w.postMessage('setoption name Threads value 1')
        w.postMessage('isready')
        return
      }
      if (line === 'readyok') { readyRef.current = true; return }

      if (line.startsWith('info') && line.includes(' score ') && line.includes(' depth ')) {
        const cpM = line.match(/score cp (-?\d+)/)
        const mateM = line.match(/score mate (-?\d+)/)
        const pvM = line.match(/ pv (\S+)/)
        latest.current = {
          cp: cpM ? parseInt(cpM[1]) : null,
          mate: mateM ? parseInt(mateM[1]) : null,
          bestMove: pvM ? pvM[1] : latest.current.bestMove,
        }
      }
      if (line.startsWith('bestmove')) {
        const bm = line.split(' ')[1]
        const res: PositionEval = { ...latest.current, bestMove: bm && bm !== '(none)' ? bm : latest.current.bestMove }
        resolveRef.current?.(res)
        resolveRef.current = null
      }
    }

    w.postMessage('uci')
    return () => { runId.current++; w.terminate() }
  }, [])

  const evalPosition = useCallback((fen: string) => new Promise<PositionEval>((resolve) => {
    latest.current = { cp: null, mate: null, bestMove: null }
    resolveRef.current = resolve
    worker.current!.postMessage('position fen ' + fen)
    worker.current!.postMessage('go depth ' + depth)
  }), [depth])

  /**
   * Avalia cada FEN em sequência. Chama onEval(index, eval) a cada posição.
   * Retorna false se foi cancelada.
   */
  const analyzeGame = useCallback(async (
    fens: string[],
    onEval: (i: number, e: PositionEval) => void,
  ): Promise<boolean> => {
    const myRun = ++runId.current
    // espera o engine ficar pronto
    let waited = 0
    while (!readyRef.current && waited < 10000) {
      await new Promise((r) => setTimeout(r, 100))
      waited += 100
    }
    if (myRun !== runId.current) return false

    setProgress({ done: 0, total: fens.length })
    for (let i = 0; i < fens.length; i++) {
      const e = await evalPosition(fens[i])
      if (myRun !== runId.current) return false // cancelada por nova partida
      onEval(i, e)
      setProgress({ done: i + 1, total: fens.length })
    }
    setProgress(null)
    return true
  }, [evalPosition])

  const cancel = useCallback(() => {
    runId.current++
    worker.current?.postMessage('stop')
    setProgress(null)
  }, [])

  return { analyzeGame, cancel, progress }
}
