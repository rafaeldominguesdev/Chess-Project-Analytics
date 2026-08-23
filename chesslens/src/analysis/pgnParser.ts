import { Chess } from 'chess.js'
import type { ClassifiedMove } from './types'
import type { GameInfo } from '../types/chess.types'

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// PGNs do chess.com (e de outras fontes) anotam o relógio depois de cada lance como um
// comentário `{[%clk H:MM:SS]}` — mesmo formato que o Lichess usa. Não dá pra pegar isso de
// `game.history()` (só devolve o lance em si), então extrai direto da string crua do PGN — a
// ordem dos comentários bate 1:1 com a ordem dos lances, já que cada lance tem no máximo um.
function parseClockComments(pgn: string): (string | null)[] {
  const matches = pgn.match(/\{\[%clk\s+([\d:.]+)\]\}/g) ?? []
  return matches.map((m) => m.match(/\{\[%clk\s+([\d:.]+)\]\}/)?.[1] ?? null)
}

function extractGameInfo(game: Chess): GameInfo {
  const h = game.header()
  return {
    white: h['White'] ?? 'Brancas',
    black: h['Black'] ?? 'Pretas',
    whiteElo: h['WhiteElo'] ?? '?',
    blackElo: h['BlackElo'] ?? '?',
    result: h['Result'] ?? '*',
    date: h['Date'] ?? '?',
    event: h['Event'] ?? '?',
    termination: h['Termination'] ?? '',
  }
}

export interface ParsedPgn {
  fens: string[]
  moves: ClassifiedMove[]
  gameInfo: GameInfo
}

/**
 * Converte um PGN cru em `{ fens, moves, gameInfo }` — pura, sem React. Usada tanto por
 * `useChessGame.ts` (carregar a partida na tela) quanto por `errorExtraction.ts` (reparsear
 * partidas salvas fora de qualquer componente, varrendo o histórico todo). Lança se o PGN for
 * inválido — cada chamador decide como reagir (um mostra erro pro usuário, o outro só pula a
 * partida e segue o scan).
 */
export function parsePgn(pgn: string): ParsedPgn {
  const game = new Chess()
  game.loadPgn(pgn)
  const gameInfo = extractGameInfo(game)
  const history = game.history({ verbose: true })
  const clocks = parseClockComments(pgn)

  const fens: string[] = [INITIAL_FEN]
  const moves: ClassifiedMove[] = []
  const temp = new Chess()

  history.forEach((move, i) => {
    const fenBefore = temp.fen()
    temp.move(move.san)
    fens.push(temp.fen())
    moves.push({
      san: move.san,
      from: move.from,
      to: move.to,
      fen: temp.fen(),
      fenBefore,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color as 'w' | 'b',
      classification: null,
      evalBefore: null,
      evalAfter: null,
      bestMove: null,
      clock: clocks[i] ?? null,
    })
  })

  return { fens, moves, gameInfo }
}
