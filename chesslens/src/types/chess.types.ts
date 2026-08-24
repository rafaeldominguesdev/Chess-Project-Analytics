export interface GameInfo {
  white: string
  black: string
  whiteElo: string
  blackElo: string
  result: string
  date: string
  event: string
  termination: string
  /** Header `TimeControl` do PGN (ex: `"600"`, `"600+5"`) — cru, sem parsear. `undefined` quando
   *  o PGN não tem esse header (fonte antiga, ou partida sem controle de tempo formal). Usado no
   *  Relatório do jogador (Sprint 3) pra comparar % de relógio restante entre partidas de ritmos
   *  diferentes (bullet/rápido/clássico). */
  timeControl?: string
}

export interface Opening {
  eco: string
  name: string
  variation: string
  fen: string
  moves: string
}

export interface EngineEvaluation {
  depth: number
  score: number
  bestMove: string | null
  pv: string
  mate: number | null
}

export interface GameStats {
  whiteAccuracy: number
  blackAccuracy: number
  whiteBlunders: number
  blackBlunders: number
  whiteMistakes: number
  blackMistakes: number
  whiteInaccuracies: number
  blackInaccuracies: number
}

export interface ChesscomGame {
  pgn: string
  url: string
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  time_class: string
  end_time: number
}
