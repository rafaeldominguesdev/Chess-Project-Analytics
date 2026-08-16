export interface ParsedGame {
  white: string
  black: string
  result: string
  timeControl: string
  date: string
  moves: string[]
}

function extractHeader(pgn: string, tag: string): string {
  const m = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`))
  return m ? m[1] : ''
}

/**
 * Parseia um PGN sem depender de biblioteca externa — extrai os headers principais e
 * devolve a lista de lances "limpa" (sem números de lance, comentários, variantes,
 * NAGs, anotações !?!! ou o token de resultado no final).
 */
export function parsePGN(pgn: string): ParsedGame {
  const white = extractHeader(pgn, 'White')
  const black = extractHeader(pgn, 'Black')
  const result = extractHeader(pgn, 'Result')
  const timeControl = extractHeader(pgn, 'TimeControl')
  const date = extractHeader(pgn, 'Date') || extractHeader(pgn, 'UTCDate')

  // O movetext começa depois do último header (que termina em "]").
  const lastHeaderEnd = pgn.lastIndexOf(']')
  const rawMovetext = lastHeaderEnd >= 0 ? pgn.slice(lastHeaderEnd + 1) : pgn

  const cleaned = rawMovetext
    .replace(/\{[^}]*\}/g, ' ')            // comentários {...}
    .replace(/\([^)]*\)/g, ' ')            // variantes (...)
    .replace(/\$\d+/g, ' ')                // NAGs ($1, $2...)
    .replace(/\d+\.\.\./g, ' ')            // "12..." (retomada depois de comentário)
    .replace(/\d+\./g, ' ')                // "12."
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ') // resultado no fim do movetext
    .trim()

  const moves = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[!?]+$/g, '')) // tira anotações tipo Nf3!, Qxf7??, e4!?

  return { white, black, result, timeControl, date, moves }
}
