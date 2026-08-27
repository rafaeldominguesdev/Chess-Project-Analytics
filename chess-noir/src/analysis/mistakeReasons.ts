import { Chess, SQUARES } from 'chess.js'
import type { Square } from 'chess.js'
import { PIECE_VALUES } from './moveClassifier'
import type { ErrorCandidate } from './errorExtraction'

export type MistakeReason = 'hanging_piece' | 'missed_fork' | 'pin' | 'back_rank' | 'generic'

export const MISTAKE_REASON_LABELS: Record<MistakeReason, string> = {
  hanging_piece: 'Peça pendurada',
  back_rank: 'Back-rank',
  missed_fork: 'Garfo não visto',
  pin: 'Cravada/enfiada',
  generic: 'Motivo genérico',
}

/** Joga um lance em UCI (ex: "e2e4", "e7e8q") — mutação in-place, devolve a casa de destino.
 *  Lança se o lance for ilegal na posição atual (chamador decide como reagir). */
function applyUci(chess: Chess, uci: string): Square {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
  chess.move({ from, to, promotion })
  return to as Square
}

function opposite(color: 'w' | 'b'): 'w' | 'b' {
  return color === 'w' ? 'b' : 'w'
}

// Em `fenAfter` (posição logo depois do lance errado), varre TODAS as peças do lado que errou
// (não só a que se moveu — um lance pode pendurar uma peça DIFERENTE ao afastar quem a
// defendia) atrás de uma peça sem defesa atacada por uma peça inimiga de valor menor ou igual.
function isHangingPiece(c: ErrorCandidate): boolean {
  const chess = new Chess(c.fenAfter)
  const enemy = opposite(c.playerColor)
  for (const sq of SQUARES) {
    const piece = chess.get(sq)
    if (!piece || piece.color !== c.playerColor || piece.type === 'k') continue
    const attackers = chess.attackers(sq, enemy)
    if (attackers.length === 0) continue
    if (chess.attackers(sq, c.playerColor).length > 0) continue // defendida — não pendura
    const cheapestAttacker = Math.min(...attackers.map((a) => PIECE_VALUES[chess.get(a)!.type] ?? Infinity))
    if (cheapestAttacker <= (PIECE_VALUES[piece.type] ?? Infinity)) return true
  }
  return false
}

// Aplica a resposta do adversário (`bestMoveAfterUci`) em cima de `fenAfter`; se virar
// xeque-mate E o rei mate estiver na própria fileira de fundo, é back-rank.
function isBackRankMate(c: ErrorCandidate): boolean {
  if (!c.bestMoveAfterUci) return false
  const chess = new Chess(c.fenAfter)
  try {
    applyUci(chess, c.bestMoveAfterUci)
  } catch {
    return false
  }
  if (!chess.isCheckmate()) return false
  const matedColor = chess.turn() // lado que ia jogar quando levou mate
  const kingSq = chess.findPiece({ type: 'k', color: matedColor })[0]
  if (!kingSq) return false
  return (matedColor === 'w' && kingSq[1] === '1') || (matedColor === 'b' && kingSq[1] === '8')
}

// Aplica `bestMoveAfterUci`; conta quantas peças do lado que errou a peça que chegou no destino
// passa a atacar — 2 ou mais é garfo não visto.
function isMissedFork(c: ErrorCandidate): boolean {
  if (!c.bestMoveAfterUci) return false
  const chess = new Chess(c.fenAfter)
  const forkerColor = chess.get(c.bestMoveAfterUci.slice(0, 2) as Square)?.color
  if (!forkerColor) return false
  let to: Square
  try {
    to = applyUci(chess, c.bestMoveAfterUci)
  } catch {
    return false
  }
  const victimColor = opposite(forkerColor)
  let hitCount = 0
  for (const sq of SQUARES) {
    const piece = chess.get(sq)
    if (piece?.color === victimColor && chess.attackers(sq, forkerColor).includes(to)) hitCount++
  }
  return hitCount >= 2
}

function squareCoords(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1], 10) - 1]
}

function coordsToSquare(file: number, rank: number): Square {
  return (String.fromCharCode(97 + file) + (rank + 1)) as Square
}

/** Primeira casa ocupada andando de `from` (exclusive) em direção a `to` (exclusive), reto ou na
 *  diagonal — `null` se as duas casas não estiverem alinhadas nesse eixo, ou se não houver
 *  nenhuma casa ocupada no caminho antes de chegar em `to`. */
function firstOccupiedBetween(chess: Chess, from: Square, to: Square): Square | null {
  const [f1, r1] = squareCoords(from)
  const [f2, r2] = squareCoords(to)
  const sameRank = r1 === r2
  const sameFile = f1 === f2
  const sameDiag = Math.abs(f2 - f1) === Math.abs(r2 - r1)
  if (!sameRank && !sameFile && !sameDiag) return null
  const df = Math.sign(f2 - f1)
  const dr = Math.sign(r2 - r1)
  let f = f1 + df
  let r = r1 + dr
  while (f !== f2 || r !== r2) {
    const sq = coordsToSquare(f, r)
    if (chess.get(sq)) return sq
    f += df
    r += dr
  }
  return null
}

// Aplica `bestMoveAfterUci`; se o destino é bispo/torre/dama, acha a primeira peça ocupada na
// reta até o rei inimigo — se for realmente a única no caminho, removê-la (num clone) e o rei
// ficar atacado confirma a cravada (a auto-correção "só uma peça no meio" sai de graça do teste:
// se houver uma SEGUNDA peça mais perto do rei, removendo só a primeira o rei continua protegido).
function isPin(c: ErrorCandidate): boolean {
  if (!c.bestMoveAfterUci) return false
  const chess = new Chess(c.fenAfter)
  let to: Square
  try {
    to = applyUci(chess, c.bestMoveAfterUci)
  } catch {
    return false
  }
  const piece = chess.get(to)
  if (!piece || (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q')) return false
  const enemyColor = opposite(piece.color)
  const kingSq = chess.findPiece({ type: 'k', color: enemyColor })[0]
  if (!kingSq) return false
  const between = firstOccupiedBetween(chess, to, kingSq)
  if (!between || chess.get(between)?.color !== enemyColor) return false
  const clone = new Chess(chess.fen())
  clone.remove(between)
  return clone.isAttacked(kingSq, piece.color)
}

// Ordem fixa de prioridade — a primeira heurística que bater vence. Motivo desconhecido cai em
// `generic`, melhor isso do que classificar errado (mesma diretriz do ROADMAP.md).
export function classifyMistakeReason(candidate: ErrorCandidate): MistakeReason {
  if (isHangingPiece(candidate)) return 'hanging_piece'
  if (isBackRankMate(candidate)) return 'back_rank'
  if (isMissedFork(candidate)) return 'missed_fork'
  if (isPin(candidate)) return 'pin'
  return 'generic'
}
