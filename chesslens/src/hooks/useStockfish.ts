import { useEffect, useRef, useState, useCallback } from 'react'

export interface StockfishEval {
  cp: number | null        // centipawns (positivo = brancas melhor)
  mate: number | null      // lances até mate
  depth: number
  bestMove: string | null  // ex: "e2e4"
  pv: string[]             // linha principal
}
// Alias mantido para compatibilidade com o nome usado na instrução
export type StockfishResult = StockfishEval

// Engine leve (lite single-threaded, ~7MB, sem NNUE pesado) servido localmente.
// Carrega em ~1-2s vs o build completo (113MB) que levava 10-30s.
const ENGINE_URL = '/stockfish/stockfish-18-lite-single.js'

export function useStockfish(targetDepth = 15) {
  const worker = useRef<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<StockfishEval | null>(null)
  const currentFen = useRef<string>('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let w: Worker
    try {
      w = new Worker(ENGINE_URL)
    } catch {
      return
    }
    worker.current = w

    w.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)

      if (line === 'uciok') {
        // Configura o engine leve assim que o UCI responde
        w.postMessage('setoption name Hash value 32')
        w.postMessage('setoption name Threads value 1')
        w.postMessage('isready')
        return
      }

      if (line === 'readyok') {
        setIsReady(true)
        return
      }

      if (line.startsWith('info') && line.includes(' score ') && line.includes(' depth ')) {
        const depthMatch = line.match(/\bdepth (\d+)/)
        const cpMatch    = line.match(/\bscore cp (-?\d+)/)
        const mateMatch  = line.match(/\bscore mate (-?\d+)/)
        const pvMatch    = line.match(/\bpv (.+)/)

        const depth = depthMatch ? parseInt(depthMatch[1]) : 0
        if (depth < 8) return // ignora profundidades baixas demais

        const cp   = cpMatch   ? parseInt(cpMatch[1])   : null
        const mate = mateMatch ? parseInt(mateMatch[1]) : null
        const pv   = pvMatch   ? pvMatch[1].trim().split(' ') : []

        setResult({ cp, mate, depth, bestMove: pv[0] ?? null, pv })
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        const bestMove = parts[1] && parts[1] !== '(none)' ? parts[1] : null
        setResult((prev) => (prev ? { ...prev, bestMove } : prev))
        setIsAnalyzing(false)
      }
    }

    // Inicia o handshake UCI de forma assíncrona — não bloqueia a UI
    w.postMessage('uci')

    return () => {
      clearTimeout(debounceTimer.current)
      w.terminate()
    }
  }, [])

  const analyze = useCallback((fen: string) => {
    if (!worker.current || !isReady) return
    if (fen === currentFen.current) return // mesma posição, não reanalisa

    // Debounce: aguarda 150ms antes de mandar pro engine
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      currentFen.current = fen
      setIsAnalyzing(true)
      worker.current!.postMessage('stop')
      worker.current!.postMessage(`position fen ${fen}`)
      worker.current!.postMessage(`go depth ${targetDepth}`)
    }, 150)
  }, [isReady, targetDepth])

  const stop = useCallback(() => {
    clearTimeout(debounceTimer.current)
    worker.current?.postMessage('stop')
    setIsAnalyzing(false)
  }, [])

  // `evaluation` é um alias de `result` para não quebrar consumidores existentes
  return { result, evaluation: result, isReady, isAnalyzing, analyze, stop }
}
