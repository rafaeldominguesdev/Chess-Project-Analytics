import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { BOT_LEVELS, clampUciElo, pickBotMove } from '../analysis/botLevels'
import type { BotLevel, EngineLineLike } from '../analysis/botLevels'
import { useMoveSound } from './useMoveSound'

// Instância PRÓPRIA do worker do Stockfish, separada da de `useStockfish.ts` — pedido explícito
// do usuário pra este modo específico: o hook de análise ao vivo (`useStockfish.ts`) foi desenhado
// com cuidado pro fluxo de "reavaliar a posição atual continuamente" (debounce, nunca duas buscas
// sobrepostas, conversão cp/mate pra perspectiva das brancas) — aqui o fluxo é bem diferente ("o
// motor joga UM lance por vez, com força limitada"), então reaproveitar aquele hook forçaria
// gambiarra nos dois lados. `useStockfish.ts` não foi tocado.
//
// Usa o build "lite" (mesmo já existente em `public/stockfish/`, mais rápido que o completo) —
// resposta ágil importa mais que profundidade máxima pra um oponente jogável, ainda mais com a
// força já sendo limitada de propósito via UCI_Elo.
const ENGINE_URL = '/stockfish/stockfish-18-lite-single.js'

export type PlayVsBotStatus = 'idle' | 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned'
export type PlayVsBotWinner = 'player' | 'bot' | 'draw' | null

export interface PlayedBotMove {
  san: string
  from: string
  to: string
  color: 'w' | 'b'
}

/**
 * Estado + lógica de uma partida real contra o Stockfish com força limitada ("Jogar contra a
 * Capivara", Sprint 4). Reaproveita `chess.js` direto pras regras (mesmo princípio de
 * `useAnalysisBoard.ts` — não duplica lógica de xadrez), mas não reaproveita aquele hook porque
 * ali a "próxima jogada" sempre vem do usuário; aqui metade das jogadas vem do motor sozinho.
 */
export function usePlayVsBot() {
  const worker = useRef<Worker | null>(null)
  const [isEngineReady, setIsEngineReady] = useState(false)

  const [status, setStatus] = useState<PlayVsBotStatus>('idle')
  const statusRef = useRef(status)
  statusRef.current = status

  const [level, setLevel] = useState<BotLevel | null>(null)
  const levelRef = useRef(level)
  levelRef.current = level

  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w')
  const playerColorRef = useRef(playerColor)
  playerColorRef.current = playerColor

  const [winner, setWinner] = useState<PlayVsBotWinner>(null)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const isBotThinkingRef = useRef(isBotThinking)
  isBotThinkingRef.current = isBotThinking

  const chessRef = useRef(new Chess())
  const [currentFen, setCurrentFen] = useState(chessRef.current.fen())
  const [moves, setMoves] = useState<PlayedBotMove[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  const { playForSan } = useMoveSound()
  const playForSanRef = useRef(playForSan)
  playForSanRef.current = playForSan

  // Incrementado a cada "sessão de jogo" nova (começar partida / desistir / sair) — usado pra
  // descartar um `bestmove` que chegue tarde demais (ex: usuário desistiu enquanto o motor ainda
  // calculava a resposta). O motor continua rodando em background até o `stop` fazer efeito; sem
  // essa checagem, aquele lance atrasado ainda seria aplicado num tabuleiro que já não é mais o dele.
  const gameGenRef = useRef(0)
  const requestGenRef = useRef(0)
  // Linhas (`MultiPV`) da busca em andamento — preenchidas pelas linhas `info ... multipv N ...`
  // que chegam antes do `bestmove` de fechamento, na ordem de rank (índice 0 = melhor).
  const pendingLinesRef = useRef<(EngineLineLike | null)[]>([])

  // Handshake UCI (igual em espírito ao de `useStockfish.ts`, mas bem mais simples: não há
  // debounce nem fila — só uma busca de cada vez, sempre esperada até o fim antes da próxima).
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
        w.postMessage('setoption name Threads value 1')
        w.postMessage('setoption name Hash value 16')
        w.postMessage('isready')
        return
      }

      if (line === 'readyok') {
        setIsEngineReady(true)
        return
      }

      if (line.startsWith('info') && line.includes(' multipv ') && line.includes(' pv ')) {
        const multipvMatch = line.match(/\bmultipv (\d+)/)
        const pvMatch = line.match(/\bpv (\S+)/) // só o 1º lance da linha interessa aqui
        if (!multipvMatch || !pvMatch) return
        const rank = parseInt(multipvMatch[1], 10)
        if (rank < 1 || rank > pendingLinesRef.current.length) return
        pendingLinesRef.current[rank - 1] = { bestMove: pvMatch[1] }
        return
      }

      if (line.startsWith('bestmove')) {
        // Busca de uma sessão de jogo que já não existe mais (desistiu/saiu/começou outra
        // partida enquanto o motor ainda pensava) — ignora silenciosamente. Importante NÃO
        // mexer em `isBotThinking` aqui nesse caso: `resign`/`quitGame` já zeraram na hora, e se
        // uma partida nova já está em andamento (ex: reiniciou rápido com "Pretas", bot começa
        // jogando de novo), essa resposta atrasada da busca ANTERIOR não pode apagar o indicador
        // "pensando" da busca ATUAL, que ainda está rodando de verdade.
        if (requestGenRef.current !== gameGenRef.current) return
        setIsBotThinking(false)

        const parts = line.split(' ')
        const rawBestMove = parts[1] && parts[1] !== '(none)' ? parts[1] : null
        const currentLevel = levelRef.current
        const chosen = currentLevel
          ? (pickBotMove(pendingLinesRef.current, currentLevel.noiseDecay) ?? rawBestMove)
          : rawBestMove
        applyMove(chosen)
        return
      }
    }

    w.postMessage('uci')

    return () => {
      w.terminate()
    }
  }, [])

  // Aplica um lance decidido (pelo motor) na posição atual e atualiza todo o estado derivado —
  // usada tanto pelo `bestmove` do motor (via listener acima) quanto, indiretamente, testável em
  // isolamento porque não depende de closures do efeito.
  function applyMove(uci: string | null) {
    if (!uci || uci.length < 4) return
    const chess = chessRef.current
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from, to, promotion })
    } catch {
      return // lance devolvido pelo motor não bate mais com a posição — não deveria acontecer, ignora
    }
    if (!result) return

    setCurrentFen(chess.fen())
    setLastMove({ from: result.from, to: result.to })
    setMoves((prev) => [...prev, { san: result.san, from: result.from, to: result.to, color: result.color as 'w' | 'b' }])
    playForSanRef.current(result.san)
    checkGameOver(chess)
  }

  // Confere fim de jogo depois de QUALQUER lance (do jogador ou do bot) e resolve vencedor/motivo.
  // `isDraw()` do chess.js já cobre afogamento/material insuficiente/repetição tripla/50 lances —
  // aqui só separamos afogamento (motivo com rótulo próprio na UI) do resto dos empates técnicos.
  function checkGameOver(chess: Chess): boolean {
    if (!chess.isGameOver()) return false
    if (chess.isCheckmate()) {
      // Quem tinha a vez (e não tinha lance nenhum) é quem apanhou o mate.
      const loserColor = chess.turn()
      setWinner(loserColor === playerColorRef.current ? 'bot' : 'player')
      setStatus('checkmate')
    } else if (chess.isStalemate()) {
      setWinner('draw')
      setStatus('stalemate')
    } else {
      setWinner('draw')
      setStatus('draw')
    }
    return true
  }

  // Pede ao motor o próximo lance do bot na posição `fen`, configurando `UCI_LimitStrength` +
  // `UCI_Elo` + `MultiPV` da faixa escolhida antes de mandar `go` — ver `analysis/botLevels.ts`
  // pro porquê: nas faixas dentro do alcance nativo do motor, o `bestmove` que ele devolve já É o
  // lance calibrado pro Elo pedido (não precisa de ruído por cima); `clampUciElo` garante que
  // nunca mandamos um `UCI_Elo` fora do intervalo que o Stockfish documenta suportar (1320–3190)
  // — as duas faixas mais fracas pedem um Elo "de vitrine" abaixo disso de propósito (ver
  // `BotLevel.elo`), então sempre passam pelo clamp antes de virar `setoption`.
  const requestBotMove = useCallback((fen: string, botLevel: BotLevel) => {
    if (!worker.current) return
    requestGenRef.current = gameGenRef.current
    pendingLinesRef.current = Array(botLevel.multiPv).fill(null)
    setIsBotThinking(true)
    worker.current.postMessage('setoption name UCI_LimitStrength value true')
    worker.current.postMessage(`setoption name UCI_Elo value ${clampUciElo(botLevel.elo)}`)
    worker.current.postMessage(`setoption name MultiPV value ${botLevel.multiPv}`)
    worker.current.postMessage(`position fen ${fen}`)
    worker.current.postMessage(`go movetime ${botLevel.movetimeMs}`)
  }, [])

  /** Começa uma partida nova do zero na faixa/cor escolhidas — se o jogador ficar com as pretas,
   *  o bot (brancas) já dispara o primeiro lance sozinho. */
  const startGame = useCallback((botLevel: BotLevel, color: 'w' | 'b') => {
    gameGenRef.current += 1
    chessRef.current = new Chess()
    setCurrentFen(chessRef.current.fen())
    setMoves([])
    setLastMove(null)
    setWinner(null)
    setLevel(botLevel)
    setPlayerColor(color)
    setStatus('playing')
    if (color === 'b') requestBotMove(chessRef.current.fen(), botLevel)
  }, [requestBotMove])

  /** Lance do jogador — valida com `chess.js` (ilegal = `false`, o tabuleiro desfaz sozinho),
   *  aplica, confere fim de jogo e, se a partida continua, dispara a resposta do bot. */
  const makeUserMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (statusRef.current !== 'playing' || isBotThinkingRef.current) return false
    const chess = chessRef.current
    if (chess.turn() !== playerColorRef.current) return false

    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from, to, promotion: promotion ?? 'q' })
    } catch {
      return false
    }
    if (!result) return false

    setCurrentFen(chess.fen())
    setLastMove({ from: result.from, to: result.to })
    setMoves((prev) => [...prev, { san: result.san, from: result.from, to: result.to, color: result.color as 'w' | 'b' }])
    playForSanRef.current(result.san)

    if (checkGameOver(chess)) return true
    if (levelRef.current) requestBotMove(chess.fen(), levelRef.current)
    return true
  }, [requestBotMove])

  /** Desiste da partida em andamento — bot vence, mesma tela de fim de jogo dos outros motivos. */
  const resign = useCallback(() => {
    if (statusRef.current !== 'playing') return
    gameGenRef.current += 1 // invalida qualquer bestmove do motor que ainda esteja a caminho
    worker.current?.postMessage('stop')
    setIsBotThinking(false)
    setWinner('bot')
    setStatus('resigned')
  }, [])

  /** Sai do modo de jogo sem declarar vencedor (volta pra tela de escolher a faixa de força). */
  const quitGame = useCallback(() => {
    gameGenRef.current += 1
    worker.current?.postMessage('stop')
    setIsBotThinking(false)
    setStatus('idle')
    setLevel(null)
    setWinner(null)
  }, [])

  return {
    levels: BOT_LEVELS,
    isEngineReady,
    status,
    level,
    playerColor,
    winner,
    isBotThinking,
    currentFen,
    moves,
    lastMove,
    startGame,
    makeUserMove,
    resign,
    quitGame,
  }
}
