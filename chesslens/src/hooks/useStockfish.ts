import { useEffect, useRef, useState, useCallback } from 'react'

export interface StockfishEval {
  // cp/mate já convertidos pra perspectiva das BRANCAS (não mais "relativo a quem joga", como o
  // protocolo UCI manda cru) — a conversão acontece aqui dentro, no momento em que a linha chega,
  // usando o lado-a-jogar da posição que essa busca específica pediu. Ver comentário em `sendSearch`.
  cp: number | null        // centipawns (positivo = brancas melhor)
  mate: number | null      // lances até mate (positivo = brancas dão mate)
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

/**
 * @param targetDepth profundidade de busca alvo — só publica quando o engine chega nela.
 * @param multiPv quantas linhas melhores pedir ao engine (1 = só a melhor, comportamento
 *   original). Com multiPv > 1, `lines[0]` é a melhor, `lines[1]` a segunda melhor, etc. —
 *   usado pelo tabuleiro de análise livre pra desenhar mais de uma seta de sugestão.
 */
export function useStockfish(targetDepth = 15, multiPv = 1) {
  const worker = useRef<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lines, setLines] = useState<(StockfishEval | null)[]>(() => Array(multiPv).fill(null))

  const engineState = useRef<EngineState>('idle')
  const activeFen = useRef<string>('')   // posição da busca em andamento no engine agora
  // Lado a jogar DA BUSCA EM ANDAMENTO — não confundir com o lado a jogar da posição que o
  // componente consumidor está mostrando AGORA (`fen`/`currentFen` de quem chama). Entre o
  // instante em que o usuário navega pra um lance novo e o instante em que essa busca nova
  // termina (pode levar vários segundos em profundidade 18), esses dois "lado a jogar" ficam
  // diferentes. Bug real encontrado (pedido do usuário: "avaliação mudando que nem louco" ao
  // navegar lances): os componentes que mostram a avaliação (barra do tabuleiro, painel Motor)
  // recalculavam o sinal usando o lado a jogar da posição ATUAL na tela, aplicado a um `cp`/`mate`
  // que na verdade ainda era da posição ANTERIOR — o sinal ficava errado por vários segundos toda
  // vez que o lado a jogar mudava de lance pra lance (ou seja, sempre). Corrigido convertendo
  // pra perspectiva das brancas aqui dentro, no momento em que a linha chega, usando o lado a
  // jogar de QUEM PEDIU essa busca — os consumidores não precisam mais adivinhar nada.
  const searchSideToMove = useRef<'w' | 'b'>('w')
  const queuedFen = useRef<string | null>(null) // posição mais recente pedida, aguardando o engine ficar livre
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const targetDepthRef = useRef(targetDepth)
  targetDepthRef.current = targetDepth
  const multiPvRef = useRef(multiPv)
  multiPvRef.current = multiPv

  const sendSearch = useCallback((fen: string) => {
    if (!worker.current) return
    activeFen.current = fen
    searchSideToMove.current = fen.split(' ')[1] === 'b' ? 'b' : 'w'
    queuedFen.current = null
    engineState.current = 'searching'
    setIsAnalyzing(true)
    // Linhas da posição anterior não valem mais pra essa busca nova — limpa antes de começar
    // a preencher de novo, senão a 2ª/3ª sugestão fica "grudada" da posição anterior por um instante.
    setLines(Array(multiPvRef.current).fill(null))
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
        // Hash maior (128MB) ajuda a busca a reaproveitar mais posições transpostas em
        // profundidades maiores — só essa instância (análise ao vivo/painel "Motor"), não a de
        // useGameAnalysis.ts (que roda uma busca atrás da outra pra classificar a partida
        // inteira; lá o custo por lance importa mais que aqui, onde só uma posição por vez).
        w.postMessage('setoption name Hash value 128')
        w.postMessage('setoption name Threads value 1')
        w.postMessage(`setoption name MultiPV value ${multiPvRef.current}`)
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

        const depthMatch  = line.match(/\bdepth (\d+)/)
        const multipvMatch = line.match(/\bmultipv (\d+)/)
        const cpMatch     = line.match(/\bscore cp (-?\d+)/)
        const mateMatch   = line.match(/\bscore mate (-?\d+)/)
        const pvMatch     = line.match(/\bpv (.+)/)

        const depth = depthMatch ? parseInt(depthMatch[1]) : 0
        // Só aceita a profundidade final: publicar cada passo intermediário (8, 9, 10...)
        // fazia a barra de avaliação reanimar várias vezes por lance (efeito de "tremida").
        if (depth < targetDepthRef.current) return

        const rank = multipvMatch ? parseInt(multipvMatch[1]) : 1
        if (rank > multiPvRef.current) return // engine pode mandar mais linhas do que pedimos, no instante da troca

        // UCI manda cp/mate relativo a quem tem a vez NA BUSCA — converte pra brancas já aqui,
        // usando o lado a jogar de quando essa busca foi pedida (`searchSideToMove`), não o da
        // posição que a tela mostra agora (podem ser diferentes, ver comentário acima do hook).
        const rawCp   = cpMatch   ? parseInt(cpMatch[1])   : null
        const rawMate = mateMatch ? parseInt(mateMatch[1]) : null
        const flip = searchSideToMove.current === 'b'
        const cp   = rawCp   !== null ? (flip ? -rawCp   : rawCp)   : null
        const mate = rawMate !== null ? (flip ? -rawMate : rawMate) : null
        const pv   = pvMatch ? pvMatch[1].trim().split(' ') : []

        setLines((prev) => {
          const next = [...prev]
          next[rank - 1] = { cp, mate, depth, bestMove: pv[0] ?? null, pv }
          return next
        })
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
          setLines((prev) => {
            if (!prev[0]) return prev
            const next = [...prev]
            next[0] = { ...next[0]!, bestMove }
            return next
          })
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

  const result = lines[0] ?? null

  // `evaluation` é um alias de `result` (linha 1 / melhor linha) para não quebrar consumidores
  // existentes que só conheciam multiPv=1. `lines` só importa pra quem pediu multiPv > 1.
  return { result, evaluation: result, lines, isReady, isAnalyzing, analyze, stop }
}
