import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { ENDGAME_POSITIONS, buildEndgameQueue } from '../analysis/endgamePositions'
import type { EndgamePosition } from '../analysis/endgamePositions'
import { fetchTablebase, isMovePreserving, pickBotDefenseMove, pickHintMove } from '../analysis/endgameTablebase'
import type { TablebasePosition } from '../analysis/endgameTablebase'
import { loadJsonRecord, saveJsonRecord, bumpMastery } from '../analysis/masteryStats'
import type { MasteryStats } from '../analysis/masteryStats'
import { useMoveSound } from './useMoveSound'

// 'loading'      → consultando a Tablebase Lichess pra posição atual (rede, não instantâneo como
//                  o banco de puzzles estático) — tanto no início de uma posição quanto depois de
//                  cada lance (a validação do PRÓXIMO lance da pessoa depende do que a tablebase
//                  disser sobre a posição resultante).
// 'solving'      → tabuleiro visível e interativo, esperando um lance que preserve o resultado
//                  teórico — é a vez de quem treina.
// 'bot-thinking' → a pessoa acabou de jogar um lance válido e o jogo continua (não terminou
//                  ainda); a "defesa" automática da tablebase está escolhendo a resposta dela.
// 'wrong'        → último lance tentado muda o resultado teórico (já desfeito); espera "tentar de
//                  novo", sem perder o progresso da partida até aqui.
// 'solved'       → o final chegou ao fim (xeque-mate, afogamento, empate por regra) sem nenhum
//                  lance que tenha jogado fora o resultado teórico — não significa necessariamente
//                  "você ganhou": numa posição cujo resultado teórico já é derrota forçada,
//                  "solved" quer dizer que resistiu com a técnica certa até o fim, não que venceu.
// 'error'        → a Tablebase não respondeu (rede indisponível, API fora do ar) — dependência
//                  externa nova pro projeto, por isso um status próprio em vez de travar
//                  silenciosamente. Pode acontecer tanto esperando o lance da pessoa quanto
//                  esperando a resposta do oponente automático — `retryFetch` refaz o pedido certo
//                  pra cada caso, sem reiniciar a posição do zero.
export type EndgameTrainerStatus = 'loading' | 'solving' | 'bot-thinking' | 'wrong' | 'solved' | 'error'

export type EndgameHintStage = 'none' | 'piece' | 'move'

const ENDGAME_STATS_KEY = 'chessnoir-endgame-stats'
// Pausa antes do oponente "responder" — só pra não parecer instantâneo/robótico, mesmo padrão de
// `showMoveHint` abaixo.
const BOT_REPLY_DELAY_MS = 500

function uciToMoveObj(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

/**
 * Estado + lógica do Treino de Finais: pega a próxima posição de um conjunto pequeno e hardcoded
 * de finais conhecidos (`analysis/endgamePositions.ts`), prioridade pro mastery mais baixo primeiro
 * (mesma aproximação recency-weighted do Treino de Aberturas/Erros), e joga o final INTEIRO contra
 * um oponente automático movido pela Tablebase pública do Lichess — não é "ache o único melhor
 * lance e pula pra próxima posição", é uma partida de verdade até xeque-mate/empate, com o
 * oponente sempre jogando a defesa/ataque tecnicamente correto (`pickBotDefenseMove`), senão não
 * testaria a técnica de quem treina. Cada lance da pessoa é validado contra a lista de lances que
 * preservam o resultado teórico da posição NAQUELE momento (não só o lance inicial) — vários
 * lances podem estar certos, não só o único melhor lance do motor. Placar de domínio por
 * CATEGORIA de final no localStorage, mesmo formato `MasteryStats` dos outros treinos.
 */
export function useEndgameTrainer() {
  const [stats, setStats] = useState<Record<string, MasteryStats>>(() => loadJsonRecord(ENDGAME_STATS_KEY))
  useEffect(() => { saveJsonRecord(ENDGAME_STATS_KEY, stats) }, [stats])

  const [queueIndex, setQueueIndex] = useState(0)
  const [status, setStatus] = useState<EndgameTrainerStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Posição em treino AGORA — estado de verdade, não derivado de `ordered[queueIndex]` a cada
  // render: `ordered` reordena por mastery toda vez que `stats` muda, e resolver a posição atual
  // já muda o mastery DELA (`bumpMastery` no fim de `finishGame`) — se `current` fosse recalculado
  // a partir do índice na lista reordenada, o card da posição trocava sozinho pra outra categoria
  // assim que a pessoa terminava, mesmo com o tabuleiro ainda mostrando o final recém-resolvido
  // (achado testando o próprio fluxo: o cabeçalho mudou pra "Final de peões" com o tabuleiro ainda
  // no xeque-mate de Rei e Dama vs Rei).
  const [current, setCurrent] = useState<EndgamePosition | null>(null)
  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [tablebase, setTablebase] = useState<TablebasePosition | null>(null)
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null)
  const [hintStage, setHintStage] = useState<EndgameHintStage>('none')
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)

  const chessRef = useRef(new Chess())
  // Lado de quem está treinando NESSA posição (o lado a jogar no FEN raiz) — fixo a posição
  // inteira, mesmo depois de vários lances. Existe só pra saber de quem é a vez a cada ply
  // (comparando com o lado a jogar do FEN ao vivo) e pra travar a orientação do tabuleiro (ver
  // `EndgameTrainerView.tsx`) — sem isso, o tabuleiro girava a cada lance porque o lado a jogar
  // alterna a cada meio-lance (bug real reportado pelo usuário: "eu clico, move peça, o tabuleiro
  // gira").
  const rootSideRef = useRef<'w' | 'b'>('w')
  const { playForSan, play } = useMoveSound()
  // Identifica qual busca de rede é a "mais recente" — se a posição trocar (pular/próxima), ou um
  // novo lance acontecer, antes de uma resposta anterior chegar, a resposta velha é ignorada em
  // vez de sobrescrever o estado errado por engano (fetch em voo não é cancelável de verdade, mas
  // dá pra ignorar) — mesma técnica de antes, agora cobrindo também os fetches de PLY em PLY (não
  // só o da posição inicial) e o timer do lance automático do oponente.
  const requestIdRef = useRef(0)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const ordered = buildEndgameQueue(ENDGAME_POSITIONS, stats)

  // Busca a tablebase da posição AO VIVO (não necessariamente a raiz — chamada de novo a cada
  // ply) e, se o pedido ainda for o mais recente quando a resposta chegar, publica o resultado e
  // avança pro status indicado (normalmente 'solving', é a vez de quem treina jogar).
  const fetchAndSetTablebase = useCallback((liveFen: string, statusWhenLoaded: EndgameTrainerStatus) => {
    const myRequestId = ++requestIdRef.current
    setStatus('loading')
    setErrorMessage(null)
    setTablebase(null)
    fetchTablebase(liveFen)
      .then((data) => {
        if (requestIdRef.current !== myRequestId) return
        setTablebase(data)
        setStatus(statusWhenLoaded)
      })
      .catch(() => {
        if (requestIdRef.current !== myRequestId) return
        setErrorMessage('Não deu pra consultar a tablebase agora (Lichess indisponível, ou sem conexão) — tenta de novo em alguns instantes.')
        setStatus('error')
      })
  }, [])

  // Fim de jogo de verdade (xeque-mate/afogamento/empate por regra) — só é chamado depois de um
  // lance que já passou pela validação de "preserva o resultado", então chegar aqui sempre conta
  // como sucesso da sessão (`solved`), mesmo quando o resultado teórico da posição era derrota
  // forçada pra quem treina (nesse caso "solved" = resistiu com a técnica certa até o fim, não
  // "venceu"). A mensagem final é só pra deixar claro qual dos dois casos foi.
  const finishGame = useCallback((chess: Chess) => {
    let message: string
    if (chess.isCheckmate()) {
      const matedSide = chess.turn() // quem tem o lance agora é quem está em xeque-mate
      const humanWon = matedSide !== rootSideRef.current
      message = humanWon
        ? 'Xeque-mate! Você converteu o resultado teórico.'
        : 'Xeque-mate contra você — esse final já era derrota forçada; resistir certo até aqui é o que conta.'
    } else if (chess.isStalemate()) {
      message = 'Afogamento — empate.'
    } else if (chess.isDraw()) {
      message = 'Empate (material insuficiente, repetição ou regra dos 50 lances).'
    } else {
      message = 'Fim de jogo.'
    }
    clearTimeout(hintTimerRef.current)
    clearTimeout(botTimerRef.current)
    setGameOverMessage(message)
    setStatus('solved')
    if (current) setStats((prev) => bumpMastery(prev, current.category, wrongAttempts, 25))
  }, [current, wrongAttempts])

  // Escolhe e joga o lance do oponente automático pra posição `liveFen` (sempre chamada com a
  // vez dele) — busca a tablebase dessa posição, pega a defesa/ataque tecnicamente correto
  // (`pickBotDefenseMove`) e aplica no tabuleiro; se o jogo termina com esse lance, fecha a
  // sessão, senão devolve a vez pra quem treina (nova busca de tablebase pra validar o próximo
  // lance da pessoa).
  const playBotReply = useCallback((liveFen: string) => {
    const myRequestId = ++requestIdRef.current
    fetchTablebase(liveFen)
      .then((data) => {
        if (requestIdRef.current !== myRequestId) return
        const move = pickBotDefenseMove(data)
        const chess = chessRef.current
        if (!move) { fetchAndSetTablebase(chess.fen(), 'solving'); return }
        let result: ReturnType<Chess['move']>
        try {
          result = chess.move(uciToMoveObj(move.uci))
        } catch {
          fetchAndSetTablebase(chess.fen(), 'solving')
          return
        }
        setFen(chess.fen())
        setLastMove({ from: result.from, to: result.to })
        playForSan(result.san)
        if (chess.isGameOver()) {
          finishGame(chess)
          return
        }
        fetchAndSetTablebase(chess.fen(), 'solving')
      })
      .catch(() => {
        if (requestIdRef.current !== myRequestId) return
        setErrorMessage('Não deu pra consultar a tablebase agora (Lichess indisponível, ou sem conexão) — tenta de novo em alguns instantes.')
        setStatus('error')
      })
  }, [fetchAndSetTablebase, finishGame, playForSan])

  const loadPosition = useCallback((position: EndgamePosition) => {
    clearTimeout(hintTimerRef.current)
    clearTimeout(botTimerRef.current)
    chessRef.current = new Chess(position.fen)
    rootSideRef.current = position.fen.split(' ')[1] === 'b' ? 'b' : 'w'
    setCurrent(position)
    setFen(position.fen)
    setLastMove(null)
    setWrongAttempts(0)
    setGameOverMessage(null)
    setHintStage('none')
    setHintSquare(null)
    setHintMove(null)
    fetchAndSetTablebase(position.fen, 'solving')
  }, [fetchAndSetTablebase])

  // Carrega a primeira posição da fila ao montar — deps vazias de propósito, igual ao Treino de
  // Erros: só importa o valor de `ordered`/`current` no momento em que a tela abre, trocas de
  // mastery depois (pelo próprio uso) não devem reiniciar a posição em andamento.
  useEffect(() => {
    const first = ordered[0]
    if (first) loadPosition(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refaz o pedido que falhou SEM perder o progresso da partida: se a rede caiu esperando o lance
  // de quem treina, busca de novo a tablebase da posição ao vivo; se caiu esperando a resposta do
  // oponente automático, tenta a resposta dele de novo — nunca reinicia a posição do zero.
  const retryFetch = useCallback(() => {
    if (!current || !fen) return
    if (fen.split(' ')[1] === rootSideRef.current) {
      fetchAndSetTablebase(fen, 'solving')
    } else {
      setStatus('bot-thinking')
      playBotReply(fen)
    }
  }, [current, fen, fetchAndSetTablebase, playBotReply])

  const nextPosition = useCallback(() => {
    const total = ordered.length
    if (total === 0) return
    const next = (queueIndex + 1) % total
    setQueueIndex(next)
    loadPosition(ordered[next])
  }, [ordered, queueIndex, loadPosition])

  const attemptMove = useCallback((sourceSquare: string, targetSquare: string, promotion?: string): boolean => {
    if (!current || status !== 'solving' || !tablebase) return false
    clearTimeout(hintTimerRef.current)
    const chess = chessRef.current
    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion ?? 'q' })
    } catch {
      return false // lance ilegal — o tabuleiro volta a peça sozinho
    }

    const playedUci = result.from + result.to + (result.promotion ?? '')
    const playedMove = tablebase.moves.find((m) => m.uci === playedUci)
    // Sem correspondência na lista da tablebase (não deveria acontecer — mesmas regras do
    // chess.js — mas se acontecer, trata como errado em vez de aceitar sem checar).
    const preserves = !!playedMove && isMovePreserving(tablebase.category, playedMove.category)

    if (!preserves) {
      chess.undo()
      setWrongAttempts((n) => n + 1)
      setStatus('wrong')
      play('error')
      return false
    }

    setFen(chess.fen())
    setLastMove({ from: result.from, to: result.to })
    playForSan(result.san)

    if (chess.isGameOver()) {
      finishGame(chess)
      return true
    }

    // Lance certo e o jogo continua — passa a vez pro oponente automático, com uma pausa curta
    // só pra não parecer instantâneo.
    const myTurnId = ++requestIdRef.current
    setStatus('bot-thinking')
    clearTimeout(botTimerRef.current)
    botTimerRef.current = setTimeout(() => {
      if (requestIdRef.current !== myTurnId) return
      playBotReply(chess.fen())
    }, BOT_REPLY_DELAY_MS)
    return true
  }, [current, status, tablebase, play, playForSan, finishGame, playBotReply])

  const retry = useCallback(() => {
    clearTimeout(hintTimerRef.current)
    setHintStage('none')
    setHintSquare(null)
    setHintMove(null)
    setStatus((s) => (s === 'wrong' ? 'solving' : s))
  }, [])

  const showPieceHint = useCallback(() => {
    if (!tablebase || status !== 'solving') return
    const target = pickHintMove(tablebase)
    if (!target) return
    setHintStage('piece')
    setHintSquare(target.uci.slice(0, 2))
  }, [tablebase, status])

  // Mostra a seta do lance inteiro e, depois de 1s, joga ele sozinho — mesmo padrão do Treino de
  // Erros/Aberturas (showMoveHint). Depois de jogar, segue o fluxo normal (fim de jogo ou vez do
  // oponente), igual a um lance manual correto.
  const showMoveHint = useCallback(() => {
    if (!tablebase || status !== 'solving') return
    const target = pickHintMove(tablebase)
    if (!target) return
    setHintStage('move')
    setHintSquare(null)
    setHintMove({ from: target.uci.slice(0, 2), to: target.uci.slice(2, 4) })

    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      const chess = chessRef.current
      let result: ReturnType<Chess['move']>
      try {
        result = chess.move(uciToMoveObj(target.uci))
      } catch {
        return
      }
      setFen(chess.fen())
      setLastMove({ from: result.from, to: result.to })
      playForSan(result.san)

      if (chess.isGameOver()) {
        finishGame(chess)
        return
      }
      const myTurnId = ++requestIdRef.current
      setStatus('bot-thinking')
      clearTimeout(botTimerRef.current)
      botTimerRef.current = setTimeout(() => {
        if (requestIdRef.current !== myTurnId) return
        playBotReply(chess.fen())
      }, BOT_REPLY_DELAY_MS)
    }, 1000)
  }, [tablebase, status, playForSan, finishGame, playBotReply])

  useEffect(() => () => { clearTimeout(hintTimerRef.current); clearTimeout(botTimerRef.current) }, [])

  return {
    status, errorMessage, current, fen, lastMove, wrongAttempts, tablebase, gameOverMessage,
    hintStage, hintSquare, hintMove, stats,
    totalInQueue: ordered.length,
    attemptMove, nextPosition, retry, retryFetch, showPieceHint, showMoveHint,
  }
}
