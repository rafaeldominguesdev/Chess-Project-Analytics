import type { MoveQuality } from './moveClassifier'

export interface ClassifiedMove {
  san: string
  from: string
  to: string
  fen: string
  /** FEN da posição ANTES desse lance (útil pra converter `bestMove`, que vem em UCI, pra SAN). */
  fenBefore: string
  moveNumber: number
  color: 'w' | 'b'
  classification: MoveQuality | null
  evalBefore: number | null
  evalAfter: number | null
  bestMove: string | null
  /** Relógio depois desse lance, direto do PGN (`{[%clk H:MM:SS]}`) — `null` quando a partida
   *  não tinha esse dado (ex: sem controle de tempo, ou PGN de fonte que não anota relógio). */
  clock: string | null
}
