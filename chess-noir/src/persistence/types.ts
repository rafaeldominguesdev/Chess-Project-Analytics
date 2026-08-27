import type { GameInfo } from '../types/chess.types'

export interface StoredGame {
  /** Chave primária — vem de `RecentGame.url` (chess.com/Lichess), estável e única por partida. */
  url: string
  pgn: string
  gameInfo: GameInfo
  savedAt: number
  /** Lado que o dono do app jogou nesta partida — vem de `RecentGame.color` (já calculado na
   *  busca, comparando contra o username buscado), só repassado até aqui. `undefined` em
   *  partidas salvas antes desse campo existir; `analysis/playerColor.ts` resolve esse caso com
   *  um fallback por nome. */
  perspectiveColor?: 'w' | 'b'
}

export interface StoredAnalysis {
  /** Mesma chave de `StoredGame.url` — 1 análise por partida, `put` sobrescreve. */
  gameUrl: string
  depth: number
  /** 1 valor por FEN da partida (perspectiva das brancas, já convertido via `toWhiteCp`). */
  whiteEvals: number[]
  bestMoves: (string | null)[]
  analyzedAt: number
}

export interface StoredPosition {
  /** `${canonicalFen}|${depth}` — ver `canonicalPositionKey` em `positionsRepo.ts`. */
  key: string
  fen: string
  depth: number
  cp: number | null
  mate: number | null
  bestMove: string | null
}
