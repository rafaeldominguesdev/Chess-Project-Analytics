export type MoveQuality =
  | 'brilliant' | 'excellent' | 'book' | 'best' | 'great'
  | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder'

export const QUALITY_CONFIG: Record<MoveQuality, { symbol: string; color: string; label: string; bg: string }> = {
  brilliant:  { symbol: '‼',  color: '#1BACA6', label: 'Brilhante',      bg: '#0D5E5B' },
  excellent:  { symbol: '!',  color: '#5C8BB0', label: 'Excelente',      bg: '#2A4A63' },
  book:       { symbol: '📖', color: '#A88865', label: 'Livro',          bg: '#3D2E1A' },
  best:       { symbol: '★',  color: '#9DC571', label: 'Melhor',         bg: '#3D5A2A' },
  great:      { symbol: '👍', color: '#7FA650', label: 'Ótimo',          bg: '#33421C' },
  good:       { symbol: '✓',  color: '#96BC4B', label: 'Bom',            bg: '#3A4D1E' },
  inaccuracy: { symbol: '?!', color: '#F0C548', label: 'Imprecisão',     bg: '#5E4D1A' },
  mistake:    { symbol: '?',  color: '#E58C2D', label: 'Erro',           bg: '#5E3A10' },
  miss:       { symbol: '✗',  color: '#E84040', label: 'Chance Perdida', bg: '#5E1A1A' },
  blunder:    { symbol: '??', color: '#C62E2E', label: 'Capivarada',     bg: '#4A1414' },
}

// Ordem de exibição usada pelas telas de revisão (mesma ordem da tabela do chess.com).
export const QUALITY_ORDER: MoveQuality[] = [
  'brilliant', 'excellent', 'book', 'best', 'great', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder',
]

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }

/**
 * Soma o valor material (P=1,N=3,B=3,R=5,Q=9) das peças de `color` na posição do FEN.
 * Rei não entra na conta (valor não-comparável entre posições).
 */
export function materialForSide(fen: string, color: 'w' | 'b'): number {
  const placement = fen.split(' ')[0]
  let total = 0
  for (const ch of placement) {
    const lower = ch.toLowerCase()
    const value = PIECE_VALUES[lower]
    if (!value) continue
    const isWhitePiece = ch !== lower
    if ((color === 'w') === isWhitePiece) total += value
  }
  return total
}

/**
 * Classifica um lance comparando a avaliação (perspectiva das brancas, em centipawns)
 * antes e depois do lance. `drop` = quanto a posição piorou para quem jogou.
 *
 * `materialDelta` = material próprio perdido pelo lance (positivo = sacrificou material).
 * Este app só tem análise single-PV (sem multi-PV nem curva de probabilidade de vitória
 * como o algoritmo real do chess.com), então esta é uma aproximação honesta baseada só
 * na queda de avaliação e em heurísticas simples de material/lance-melhor.
 */
export function classifyMove(
  evalBefore: number,
  evalAfter: number,
  color: 'w' | 'b',
  isBestMove: boolean,
  isBook: boolean,
  materialDelta = 0,
): MoveQuality {
  if (isBook) return 'book'
  // Normaliza para a perspectiva de quem jogou
  const before = color === 'w' ? evalBefore : -evalBefore
  const after = color === 'w' ? evalAfter : -evalAfter
  const drop = Math.max(0, before - after)

  if (isBestMove) {
    // Lance melhor que sacrifica material numa posição aproximadamente equilibrada
    if (materialDelta > 0 && Math.abs(before) < 400) return 'brilliant'
    return 'best'
  }
  if (drop < 10) return 'excellent'
  if (drop < 30) return 'great'
  if (drop < 50) return 'good'
  if (drop < 90) return 'inaccuracy'
  // Estava claramente ganhando e jogou fora boa parte da vantagem
  if (before >= 200 && drop >= 90 && drop < 250) return 'miss'
  if (drop < 200) return 'mistake'
  return 'blunder'
}

/** Converte um score do Stockfish para centipawns na perspectiva das brancas. */
export function toWhiteCp(cp: number | null, mate: number | null, sideToMove: 'w' | 'b'): number {
  let v: number
  if (mate !== null) v = mate > 0 ? 2000 : -2000
  else v = cp ?? 0
  // score do engine é relativo a quem joga → converte para brancas
  const white = sideToMove === 'w' ? v : -v
  return Math.max(-2000, Math.min(2000, white))
}

export function calcAccuracy(moves: { classification: MoveQuality | null; color: 'w' | 'b' }[], color: 'w' | 'b'): number {
  const own = moves.filter((m) => m.color === color && m.classification)
  if (own.length === 0) return 100
  const weights: Record<MoveQuality, number> = {
    brilliant: 100, best: 100, excellent: 100, book: 100,
    great: 95, good: 90,
    inaccuracy: 70, mistake: 40, miss: 20, blunder: 0,
  }
  const sum = own.reduce((acc, m) => acc + (weights[m.classification!] ?? 0), 0)
  return Math.round(sum / own.length)
}
