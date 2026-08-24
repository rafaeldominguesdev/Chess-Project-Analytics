import { Chess } from 'chess.js'
import type { ClassifiedMove } from './types'
import { QUALITY_CONFIG, winningChances } from './moveClassifier'

/** Queda de % de chance de vitória (0-100, perspectiva de quem jogou) causada por um lance —
 *  mesma técnica usada por `classifyMove`/`moveAccuracyScore` (não duplica a fórmula, só reusa
 *  `winningChances`, que já é exportado; `winPercent` em si é privado de `moveClassifier.ts`). */
function moveWinDrop(move: ClassifiedMove): number {
  if (move.evalBefore === null || move.evalAfter === null) return 0
  const before = move.color === 'w' ? move.evalBefore : -move.evalBefore
  const after = move.color === 'w' ? move.evalAfter : -move.evalAfter
  // winningChances devolve -1..1 → diferença * 50 equivale à mesma escala 0-100 de winPercent.
  return Math.max(0, (winningChances(before) - winningChances(after)) * 50)
}

export interface CriticalPosition {
  /** FEN da posição a ser exportada como imagem. */
  fen: string
  /** Lance associado — usado pra destacar `from`/`to` no desenho e montar a legenda. */
  move: ClassifiedMove
  /** true quando a partida terminou em xeque-mate nessa posição (prioridade sobre "pior lance"). */
  isCheckmate: boolean
  /** Legenda pronta pra exibir/gravar junto da imagem (ex: "24...Kxf1 — Capivarada"). */
  label: string
}

/**
 * Acha a "posição crítica" de uma partida analisada: a posição final se a partida terminou em
 * xeque-mate (mais notável que qualquer erro), senão a posição ANTES do lance com maior queda de
 * chance de vitória (o momento em que a decisão errada foi tomada — mais didático mostrar "aqui
 * era a hora de escolher certo" do que só o resultado depois do erro). `null` quando não há
 * nenhum lance com avaliação (partida ainda não analisada nem um pouco).
 */
export function findCriticalPosition(moves: ClassifiedMove[]): CriticalPosition | null {
  if (moves.length === 0) return null

  const last = moves[moves.length - 1]
  // try/catch defensivo: `last.fen` sempre vem de `chess.js` na prática (`pgnParser.ts`), mas
  // não custa não derrubar o export inteiro se algum dia vier algo malformado aqui.
  let lastIsCheckmate = false
  try {
    lastIsCheckmate = new Chess(last.fen).isCheckmate()
  } catch { /* trata como "não é mate" */ }
  if (lastIsCheckmate) {
    return {
      fen: last.fen,
      move: last,
      isCheckmate: true,
      label: `${last.moveNumber}${last.color === 'w' ? '.' : '...'} ${last.san}# — Xeque-mate`,
    }
  }

  let critical: ClassifiedMove | null = null
  let maxDrop = -1
  for (const move of moves) {
    const drop = moveWinDrop(move)
    if (drop > maxDrop) {
      maxDrop = drop
      critical = move
    }
  }
  if (!critical || maxDrop <= 0) return null

  const qualityLabel = critical.classification ? QUALITY_CONFIG[critical.classification].label : 'Momento decisivo'
  return {
    fen: critical.fenBefore,
    move: critical,
    isCheckmate: false,
    label: `${critical.moveNumber}${critical.color === 'w' ? '.' : '...'} ${critical.san} — ${qualityLabel}`,
  }
}
