import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { ENDGAME_POSITIONS, buildEndgameQueue } from '../analysis/endgamePositions'
import type { EndgamePosition } from '../analysis/endgamePositions'
import { fetchTablebase, isMovePreserving, pickHintMove } from '../analysis/endgameTablebase'
import type { TablebasePosition } from '../analysis/endgameTablebase'
import { loadJsonRecord, saveJsonRecord, bumpMastery } from '../analysis/masteryStats'
import type { MasteryStats } from '../analysis/masteryStats'
import { useMoveSound } from './useMoveSound'

// 'loading' → consultando a Tablebase Lichess pra posição atual (rede, não instantâneo como o
//             banco de puzzles estático).
// 'solving' → tabuleiro visível e interativo, esperando um lance que preserve o resultado teórico.
// 'wrong'   → último lance tentado muda o resultado teórico (já desfeito); espera "tentar de novo".
// 'solved'  → acertou (qualquer lance que preserva o resultado conta, não só "o melhor").
// 'error'   → a Tablebase não respondeu (rede indisponível, API fora do ar) — dependência externa
//             nova pro projeto, por isso um status próprio em vez de travar silenciosamente.
export type EndgameTrainerStatus = 'loading' | 'solving' | 'wrong' | 'solved' | 'error'

export type EndgameHintStage = 'none' | 'piece' | 'move'

const ENDGAME_STATS_KEY = 'chesslens-endgame-stats'

function uciToMoveObj(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

/**
 * Estado + lógica do Treino de Finais: pega a próxima posição de um conjunto pequeno e hardcoded
 * de finais conhecidos (`analysis/endgamePositions.ts`), prioridade pro mastery mais baixo primeiro
 * (mesma aproximação recency-weighted do Treino de Aberturas/Erros), consulta a Tablebase pública
 * do Lichess pra saber quais lances preservam o resultado teórico daquela posição, e valida o
 * lance da pessoa contra ESSA lista — não contra "o único melhor lance do motor", já que em
 * finais vários lances podem manter o mesmo resultado (vitória/empate/derrota forçada). Placar de
 * domínio por CATEGORIA de final no localStorage, mesmo formato `MasteryStats` dos outros treinos.
 */
export function useEndgameTrainer() {
  const [stats, setStats] = useState<Record<string, MasteryStats>>(() => loadJsonRecord(ENDGAME_STATS_KEY))
  useEffect(() => { saveJsonRecord(ENDGAME_STATS_KEY, stats) }, [stats])

  const [queueIndex, setQueueIndex] = useState(0)
  const [status, setStatus] = useState<EndgameTrainerStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [tablebase, setTablebase] = useState<TablebasePosition | null>(null)
  const [hintStage, setHintStage] = useState<EndgameHintStage>('none')
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)

  const chessRef = useRef(new Chess())
  const { playForSan, play } = useMoveSound()
  // Identifica qual busca de rede é a "mais recente" — se a posição trocar (pular/próxima) antes
  // da resposta anterior chegar, a resposta velha é ignorada em vez de sobrescrever o estado da
  // posição nova por engano (fetch em voo não é cancelável de verdade, mas dá pra ignorar).
  const requestIdRef = useRef(0)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const ordered = buildEndgameQueue(ENDGAME_POSITIONS, stats)
  const current: EndgamePosition | null = ordered[queueIndex % ordered.length] ?? null

  const loadTablebase = useCallback((position: EndgamePosition) => {
    const myRequestId = ++requestIdRef.current
    clearTimeout(hintTimerRef.current)
    setStatus('loading')
    setErrorMessage(null)
    setTablebase(null)
    setHintStage('none')
    setHintSquare(null)
    setHintMove(null)
    setWrongAttempts(0)
    chessRef.current = new Chess(position.fen)
    setFen(position.fen)
    setLastMove(null)

    fetchTablebase(position.fen)
      .then((data) => {
        if (requestIdRef.current !== myRequestId) return
        setTablebase(data)
        setStatus('solving')
      })
      .catch(() => {
        if (requestIdRef.current !== myRequestId) return
        setErrorMessage('Não deu pra consultar a tablebase agora (Lichess indisponível, ou sem conexão) — tenta de novo em alguns instantes.')
        setStatus('error')
      })
  }, [])

  // Carrega a primeira posição da fila ao montar — deps vazias de propósito, igual ao Treino de
  // Erros: só importa o valor de `ordered`/`current` no momento em que a tela abre, trocas de
  // mastery depois (pelo próprio uso) não devem reiniciar a posição em andamento.
  useEffect(() => {
    if (current) loadTablebase(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retryFetch = useCallback(() => {
    if (current) loadTablebase(current)
  }, [current, loadTablebase])

  const nextPosition = useCallback(() => {
    const total = ordered.length
    if (total === 0) return
    const next = (queueIndex + 1) % total
    setQueueIndex(next)
    loadTablebase(ordered[next])
  }, [ordered, queueIndex, loadTablebase])

  const markSolved = useCallback((san: string) => {
    if (!current) return
    setStatus('solved')
    playForSan(san)
    setStats((prev) => bumpMastery(prev, current.category, wrongAttempts, 25))
  }, [current, wrongAttempts, playForSan])

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
    markSolved(result.san)
    return true
  }, [current, status, tablebase, play, markSolved])

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
  // Erros/Aberturas (showMoveHint).
  const showMoveHint = useCallback(() => {
    if (!tablebase || status !== 'solving') return
    const target = pickHintMove(tablebase)
    if (!target) return
    setHintStage('move')
    setHintSquare(null)
    setHintMove({ from: target.uci.slice(0, 2), to: target.uci.slice(2, 4) })

    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      let result: ReturnType<Chess['move']>
      try {
        result = chessRef.current.move(uciToMoveObj(target.uci))
      } catch {
        return
      }
      setFen(chessRef.current.fen())
      setLastMove({ from: result.from, to: result.to })
      markSolved(result.san)
    }, 1000)
  }, [tablebase, status, markSolved])

  useEffect(() => () => clearTimeout(hintTimerRef.current), [])

  return {
    status, errorMessage, current, fen, lastMove, wrongAttempts, tablebase,
    hintStage, hintSquare, hintMove, stats,
    totalInQueue: ordered.length,
    attemptMove, nextPosition, retry, retryFetch, showPieceHint, showMoveHint,
  }
}
