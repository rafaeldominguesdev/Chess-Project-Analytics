import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { extractErrorCandidates } from '../analysis/errorExtraction'
import type { ErrorCandidate } from '../analysis/errorExtraction'
import { classifyMistakeReason } from '../analysis/mistakeReasons'
import type { MistakeReason } from '../analysis/mistakeReasons'
import { loadJsonRecord, saveJsonRecord, bumpMastery } from '../analysis/masteryStats'
import type { MasteryStats } from '../analysis/masteryStats'
import { useMoveSound } from './useMoveSound'

// 'loading'  → varrendo as partidas salvas (IndexedDB, assíncrono) — diferente do banco de
//              puzzles estático, aqui precisa esperar antes de saber se tem algo pra treinar.
// 'solving'  → tabuleiro visível e interativo, esperando o lance certo (o que deveria ter sido
//              jogado no lugar do erro).
// 'wrong'    → último lance tentado não é o certo (já desfeito); espera confirmar "tentar de novo".
// 'solved'   → acertou. Cada item é um lance só — não há resposta automática de adversário pra
//              agendar (a análise salva só guarda 1 melhor lance por posição, não uma linha).
// 'empty'    → nenhum erro encontrado nas partidas analisadas ainda (ou no filtro escolhido).
export type ErrorTrainerStatus = 'loading' | 'solving' | 'wrong' | 'solved' | 'empty'

// Dica em 3 estágios, pedido explícito do roadmap (motivo → peça envolvida → lance):
// 'reason' só revela o texto do motivo (sem mexer no tabuleiro); 'piece' destaca a casa de
// origem do lance certo; 'move' mostra a seta inteira e joga sozinho depois de 1s.
export type HintStage = 'none' | 'reason' | 'piece' | 'move'

const ERROR_STATS_KEY = 'chesslens-error-stats'
// Corta quantos candidatos de UMA MESMA partida entram na fila de treino — sem isso, uma
// partida excepcionalmente ruim dominaria a sessão inteira sozinha. `extractErrorCandidates`
// continua devolvendo a lista completa/sem corte (o Relatório do jogador, Sprint 3, precisa
// dela inteira) — o corte é só uma decisão de como MONTAR uma sessão, feita aqui.
const MAX_PER_GAME = 5

interface TrainingItem {
  candidate: ErrorCandidate
  reason: MistakeReason
}

function uciToMoveObj(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

// Corta no máximo `MAX_PER_GAME` candidatos por partida (prioriza capivarada sobre erro, e
// dentro da mesma categoria a queda de avaliação maior primeiro — os erros mais graves de cada
// partida) e ordena o resultado pelo mastery do MOTIVO (mais baixo primeiro) — isso é o que faz
// a fila puxar mais o que a pessoa mais erra, sem ser uma repetição espaçada de verdade (mesma
// aproximação já aceita no Treino de Aberturas).
function buildQueue(all: TrainingItem[], stats: Record<string, MasteryStats>): TrainingItem[] {
  const byGame = new Map<string, TrainingItem[]>()
  for (const item of all) {
    const arr = byGame.get(item.candidate.gameUrl) ?? []
    arr.push(item)
    byGame.set(item.candidate.gameUrl, arr)
  }
  const capped: TrainingItem[] = []
  for (const arr of byGame.values()) {
    arr.sort((a, b) => {
      const sevA = a.candidate.classification === 'blunder' ? 1 : 0
      const sevB = b.candidate.classification === 'blunder' ? 1 : 0
      if (sevA !== sevB) return sevB - sevA
      return Math.abs(b.candidate.evalDelta) - Math.abs(a.candidate.evalDelta)
    })
    capped.push(...arr.slice(0, MAX_PER_GAME))
  }
  return capped.sort((a, b) => (stats[a.reason]?.mastery ?? 50) - (stats[b.reason]?.mastery ?? 50))
}

/**
 * Estado + lógica do Treino de Erros: varre as partidas já analisadas e salvas (Sprint 1,
 * persistence/) atrás de lances errados, descobre o motivo de cada um (Sprint 2b), monta uma
 * fila priorizando o motivo com pior mastery, e treina um lance por vez — o tabuleiro aparece na
 * posição de ANTES do erro, e o objetivo é achar o lance que o motor recomendava no lugar dele.
 * Placar de domínio por motivo no localStorage (mesma aproximação do Treino de Aberturas — média
 * móvel entre sessões, não repetição espaçada de verdade).
 */
export function useErrorTrainer(initialReasonFilter?: MistakeReason) {
  const [status, setStatus] = useState<ErrorTrainerStatus>('loading')
  // Distingue "ainda não terminou o scan" (allItems=[] só porque nunca populou) de "terminou e
  // não achou nada" (allItems=[] de verdade) — sem isso, uma conta genuinamente vazia ficaria
  // presa em 'loading' pra sempre, já que os dois casos têm o mesmo `allItems.length === 0`.
  const [extracted, setExtracted] = useState(false)
  const [allItems, setAllItems] = useState<TrainingItem[]>([])
  // Deep-link vindo do Relatório do jogador (Sprint 3e, "treinar isso agora") — seed do filtro
  // inicial. Diferente do `startLine` do Treino de Aberturas, não precisa de efeito: é só o
  // valor inicial de um `useState`, sem side-effect nenhum atrelado a ele.
  const [reasonFilter, setReasonFilter] = useState<MistakeReason | 'all'>(initialReasonFilter ?? 'all')
  const [stats, setStats] = useState<Record<string, MasteryStats>>(() => loadJsonRecord(ERROR_STATS_KEY))
  const [queueIndex, setQueueIndex] = useState(0)
  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintStage, setHintStage] = useState<HintStage>('none')
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => { saveJsonRecord(ERROR_STATS_KEY, stats) }, [stats])

  const { playForSan, play } = useMoveSound()
  const chessRef = useRef(new Chess())
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const queue = reasonFilter === 'all' ? allItems : allItems.filter((i) => i.reason === reasonFilter)
  const ordered = buildQueue(queue, stats)
  const current = ordered[queueIndex % ordered.length] ?? null

  const loadItem = useCallback((item: TrainingItem | null) => {
    clearTimeout(hintTimerRef.current)
    setHintStage('none')
    setHintSquare(null)
    setHintMove(null)
    setWrongAttempts(0)
    if (!item) {
      setStatus('empty')
      return
    }
    chessRef.current = new Chess(item.candidate.fenBefore)
    setFen(item.candidate.fenBefore)
    setLastMove(null)
    setStatus('solving')
  }, [])

  // Varre as partidas salvas uma vez ao montar — assíncrono (IndexedDB), por isso o status
  // 'loading' explícito antes de decidir 'solving' vs 'empty'.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setExtracted(false)
    extractErrorCandidates().then((candidates) => {
      if (cancelled) return
      const items = candidates.map((candidate) => ({ candidate, reason: classifyMistakeReason(candidate) }))
      setAllItems(items)
      setQueueIndex(0)
      setExtracted(true)
    })
    return () => { cancelled = true }
  }, [])

  // Assim que o scan termina (ou o filtro de motivo muda depois), carrega o item atual da fila
  // recalculada — `current` já reflete `allItems`/`reasonFilter` mais recentes no mesmo render.
  useEffect(() => {
    if (!extracted) return // ainda esperando o scan terminar
    loadItem(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extracted, allItems, reasonFilter])

  const nextItem = useCallback(() => {
    const total = ordered.length
    if (total === 0) { loadItem(null); return }
    const next = (queueIndex + 1) % total
    setQueueIndex(next)
    loadItem(ordered[next])
  }, [ordered, queueIndex, loadItem])

  const retry = useCallback(() => {
    clearTimeout(hintTimerRef.current)
    setHintStage('none')
    setHintSquare(null)
    setHintMove(null)
    setStatus((s) => (s === 'wrong' ? 'solving' : s))
  }, [])

  const markSolved = useCallback((san: string) => {
    if (!current) return
    setStatus('solved')
    playForSan(san)
    play('victory')
    setStats((prev) => bumpMastery(prev, current.reason, wrongAttempts, 25))
  }, [current, wrongAttempts, playForSan, play])

  const attemptMove = useCallback((sourceSquare: string, targetSquare: string, promotion?: string): boolean => {
    if (!current || status !== 'solving') return false
    clearTimeout(hintTimerRef.current)
    const chess = chessRef.current
    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion ?? 'q' })
    } catch {
      return false // lance ilegal — o tabuleiro volta a peça sozinho
    }

    const playedUci = result.from + result.to + (result.promotion ?? '')
    if (playedUci !== current.candidate.bestMoveUci) {
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
  }, [current, status, play, markSolved])

  const showReasonHint = useCallback(() => {
    if (status !== 'solving') return
    setHintStage((s) => (s === 'none' ? 'reason' : s))
  }, [status])

  const showPieceHint = useCallback(() => {
    if (!current || status !== 'solving') return
    setHintStage('piece')
    setHintSquare(current.candidate.bestMoveUci.slice(0, 2))
  }, [current, status])

  // Mostra a seta do lance certo e, depois de 1s, joga ele sozinho — mesmo padrão do Puzzle
  // Trainer e do Treino de Aberturas.
  const showMoveHint = useCallback(() => {
    if (!current || status !== 'solving') return
    const uci = current.candidate.bestMoveUci
    setHintStage('move')
    setHintSquare(null)
    setHintMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) })

    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      let result: ReturnType<Chess['move']>
      try {
        result = chessRef.current.move(uciToMoveObj(uci))
      } catch {
        return
      }
      setFen(chessRef.current.fen())
      setLastMove({ from: result.from, to: result.to })
      markSolved(result.san)
    }, 1000)
  }, [current, status, markSolved])

  useEffect(() => () => clearTimeout(hintTimerRef.current), [])

  return {
    status, current: current?.candidate ?? null, reason: current?.reason ?? null,
    fen, lastMove, wrongAttempts, hintStage, hintSquare, hintMove,
    reasonFilter, setReasonFilter, stats,
    totalInQueue: ordered.length,
    attemptMove, nextItem, retry, showReasonHint, showPieceHint, showMoveHint,
  }
}
