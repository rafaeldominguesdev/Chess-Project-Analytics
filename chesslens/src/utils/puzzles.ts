import puzzlesRaw from '../data/puzzles.json'

export interface Puzzle {
  id: string
  fen: string
  /** Lances em UCI (ex: "e2e4"). O primeiro é o lance de "preparo" que já leva à posição que o
   *  solver precisa resolver — a partir do segundo é que entra a sequência que o jogador acerta. */
  moves: string[]
  rating: number
  themes: string[]
  gameUrl: string
}

type RawPuzzle = [string, string, string, number, string, string]

// Banco de táticas (fonte: database.lichess.org/lichess_db_puzzle.csv.zst, licença CC0) — 1500
// puzzles reais, filtrados por rating 1500–2500 (150 por faixa de 100 pontos, pra cobertura
// uniforme) e por popularidade/nº de jogadas mínimos, pra evitar puzzle mal rotulado ou obscuro.
// Não existe base pública equivalente de puzzles em massa do chess.com pra usar aqui.
export const PUZZLES: Puzzle[] = (puzzlesRaw as RawPuzzle[]).map(([id, fen, moves, rating, themes, gameUrl]) => ({
  id,
  fen,
  moves: moves.split(' '),
  rating,
  themes: themes ? themes.split(' ') : [],
  gameUrl,
}))

export const PUZZLE_RATING_MIN = Math.min(...PUZZLES.map((p) => p.rating))
export const PUZZLE_RATING_MAX = Math.max(...PUZZLES.map((p) => p.rating))

export function getPuzzlesInRange(min: number, max: number): Puzzle[] {
  return PUZZLES.filter((p) => p.rating >= min && p.rating <= max)
}

/** Puzzle aleatório dentro da faixa, evitando repetir os últimos resolvidos nessa sessão quando dá. */
export function getRandomPuzzle(min: number, max: number, excludeIds?: Set<string>): Puzzle | null {
  let pool = getPuzzlesInRange(min, max)
  if (pool.length === 0) return null
  if (excludeIds && excludeIds.size < pool.length) {
    const filtered = pool.filter((p) => !excludeIds.has(p.id))
    if (filtered.length > 0) pool = filtered
  }
  return pool[Math.floor(Math.random() * pool.length)]
}
