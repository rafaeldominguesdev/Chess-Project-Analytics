export interface GameInfo {
  white: string
  black: string
  whiteElo: string
  blackElo: string
  result: string
  date: string
  event: string
  termination: string
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
