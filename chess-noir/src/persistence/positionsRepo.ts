import { getItem, putItem, STORES } from './db'
import type { StoredPosition } from './types'

interface CachedEval {
  cp: number | null
  mate: number | null
  bestMove: string | null
}

/**
 * Chave canônica ignorando os 2 últimos campos do FEN (relógio de meio-lance / número do lance
 * inteiro) — eles não afetam a avaliação, e ignorá-los é o que permite que a MESMA posição,
 * alcançada por partidas diferentes (ex: mesma linha de abertura), compartilhe uma entrada de
 * cache em vez de uma por partida.
 */
export function canonicalPositionKey(fen: string, depth: number): string {
  const [board, turn, castling, ep] = fen.split(' ')
  return `${board} ${turn} ${castling} ${ep}|${depth}`
}

export async function getCachedPosition(fen: string, depth: number): Promise<CachedEval | null> {
  const stored = await getItem<StoredPosition>(STORES.positions, canonicalPositionKey(fen, depth))
  if (!stored) return null
  return { cp: stored.cp, mate: stored.mate, bestMove: stored.bestMove }
}

export async function putCachedPosition(fen: string, depth: number, e: CachedEval): Promise<void> {
  await putItem<StoredPosition>(STORES.positions, {
    key: canonicalPositionKey(fen, depth), fen, depth, cp: e.cp, mate: e.mate, bestMove: e.bestMove,
  })
}
