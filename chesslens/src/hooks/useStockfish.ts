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

// Build completo (rede NNUE cheia, mesma força que roda no chess.com), single-threaded.
// ~108MB — primeiro carregamento é bem mais lento que o build "lite", mas a avaliação
// fica muito mais próxima da que o chess.com mostra.
const ENGINE_URL = '/stockfish/stockfish-18-single.js'

// Estado do ciclo de vida de uma busca UCI — o protocolo exige esperar o `bestmove` que fecha
// uma busca antes de mandar a próxima `position`+`go`, senão o engine pode devolver uma linha
// "info depth" perdida da posição anterior bem na hora que a nova busca começa — isso fazia a
// barra de avaliação "tremer"/pular pro valor errado por um instante a cada lance navegado
// rápido (ex: segurando seta, autoplay). Resolvendo isso na raiz: nunca aceitar `info` fora de
// uma busca que sabemos ser a mais recente, e sempre esperar o `bestmove` de fechamento antes
// de iniciar a próxima.
type EngineState = 'idle' | 'searching' | 'stopping'

export function useStockfish(targetDepth = 15) {
  const worker = useRef<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<StockfishEval | null>(null)

  const engineState = useRef<EngineState>('idle')
  const activeFen = useRef<string>('')   // posição da busca em andamento no engine agora
  const queuedFen = useRef<string | null>(null) // posição mais recente pedida, aguardando o engine ficar livre
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const targetDepthRef = useRef(targetDepth)
  targetDepthRef.current = targetDepth

  const sendSearch = useCallback((fen: string) => {
    if (!worker.current) return
    activeFen.current = fen
    queuedFen.current = null
    engineState.current = 'searching'
    setIsAnalyzing(true)
    worker.current.postMessage(`position fen ${fen}`)
    worker.current.postMessage(`go depth ${targetDepthRef.current}`)
  }, [])

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
        // Configura o engine assim que o UCI responde
        w.postMessage('setoption name Hash value 64')
        w.postMessage('setoption name Threads value 1')
        w.postMessage('isready')
        return
      }

      if (line === 'readyok') {
        setIsReady(true)
        return
      }

      if (line.startsWith('info') && line.includes(' score ') && line.includes(' depth ')) {
        // Enquanto estamos "stopping" (esperando o bestmove que fecha a busca anterior), toda
        // linha "info" que ainda chegar é resíduo da posição antiga — descarta sem aplicar.
        if (engineState.current !== 'searching') return

        const depthMatch = line.match(/\bdepth (\d+)/)
        const cpMatch    = line.match(/\bscore cp (-?\d+)/)
        const mateMatch  = line.match(/\bscore mate (-?\d+)/)
        const pvMatch    = line.match(/\bpv (.+)/)

        const depth = depthMatch ? parseInt(depthMatch[1]) : 0
        // Só aceita a profundidade final: publicar cada passo intermediário (8, 9, 10...)
        // fazia a barra de avaliação reanimar várias vezes por lance (efeito de "tremida").
        if (depth < targetDepthRef.current) return

        const cp   = cpMatch   ? parseInt(cpMatch[1])   : null
        const mate = mateMatch ? parseInt(mateMatch[1]) : null
        const pv   = pvMatch   ? pvMatch[1].trim().split(' ') : []

        setResult({ cp, mate, depth, bestMove: pv[0] ?? null, pv })
        return
      }

      if (line.startsWith('bestmove')) {
        // Esse bestmove fecha a busca ativa (natural ou por 'stop'). Se enquanto ela rodava
        // já chegou um pedido pra uma posição nova, é só agora — com o engine de fato livre —
        // que podemos mandar a próxima. Isso garante que nunca há duas buscas "sobrepostas".
        const wasSearching = engineState.current === 'searching'
        engineState.current = 'idle'

        if (queuedFen.current !== null) {
          sendSearch(queuedFen.current)
          return
        }

        if (wasSearching) {
          const parts = line.split(' ')
          const bestMove = parts[1] && parts[1] !== '(none)' ? parts[1] : null
          setResult((prev) => (prev ? { ...prev, bestMove } : prev))
        }
        setIsAnalyzing(false)
      }
    }

    // Inicia o handshake UCI de forma assíncrona — não bloqueia a UI
    w.postMessage('uci')

    return () => {
      clearTimeout(debounceTimer.current)
      w.terminate()
    }
  }, [sendSearch])

  const analyze = useCallback((fen: string) => {
    if (!worker.current || !isReady) return
    // Alvo "efetivo" agora: a próxima posição na fila se houver uma, senão a que está ativa
    // (em busca ou já resolvida). Pedir de novo essa mesma posição não faz nada.
    const effectiveTarget = queuedFen.current ?? activeFen.current
    if (fen === effectiveTarget) return

    // Debounce: aguarda 150ms antes de mandar pro engine (evita rajada de posições
    // intermediárias ao navegar rápido — só a última pedida realmente importa).
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (engineState.current === 'idle') {
        sendSearch(fen)
      } else {
        // Busca em andamento: pede pra parar e enfileira essa posição como a próxima —
        // só será enviada quando o 'bestmove' de fechamento confirmar que o engine está livre.
        queuedFen.current = fen
        if (engineState.current === 'searching') {
          engineState.current = 'stopping'
          worker.current!.postMessage('stop')
        }
      }
    }, 150)
  }, [isReady, sendSearch])

  const stop = useCallback(() => {
    clearTimeout(debounceTimer.current)
    queuedFen.current = null
    if (engineState.current === 'searching') {
      engineState.current = 'stopping'
      worker.current?.postMessage('stop')
    }
    setIsAnalyzing(false)
  }, [])

  // `evaluation` é um alias de `result` para não quebrar consumidores existentes
  return { result, evaluation: result, isReady, isAnalyzing, analyze, stop }
}
