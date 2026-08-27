import openingsRaw from '../data/eco-openings.json'

export interface OpeningMatch {
  eco: string
  name: string
  moves: string // SAN, separados por espaço — ex: "e4 e5 Nf3 Nc6 Bb5"
}

// Banco de aberturas ECO (fonte: lichess-org/chess-openings, MIT) — 3810 linhas nomeadas,
// convertidas em runtime pra um mapa "sequência de lances SAN" → { eco, name }. Indexado pela
// string completa do prefixo pra permitir match do prefixo MAIS LONGO possível (ver identifyOpening).
const OPENINGS_MAP: Map<string, OpeningMatch> = new Map(
  (openingsRaw as [string, string, string][]).map(([eco, name, moves]) => [moves, { eco, name, moves }]),
)

// Todo prefixo de toda linha nomeada — usado por isBookMove pra saber se uma sequência de
// lances ainda está dentro de teoria conhecida, mesmo quando esse prefixo exato não é, ele
// próprio, uma linha nomeada (ex: "e4 e5 Nf3 Nc6 Bb5 Nf6" é teoria mesmo sem ter nome próprio,
// porque é prefixo de "Ruy Lopez: Berlin Defense").
const OPENING_PREFIXES: Set<string> = new Set()
for (const [, , moves] of openingsRaw as [string, string, string][]) {
  const tokens = moves.split(' ')
  for (let k = 1; k <= tokens.length; k++) {
    OPENING_PREFIXES.add(tokens.slice(0, k).join(' '))
  }
}

/** Diz se essa sequência de lances (desde o início da partida) ainda está dentro de teoria conhecida. */
export function isBookMove(movesSoFar: string[]): boolean {
  return OPENING_PREFIXES.has(movesSoFar.join(' '))
}

// Além desse número de lances a partida já saiu da teoria — não vale a pena continuar procurando.
const MAX_PLY = 40

/**
 * Identifica a abertura jogada a partir da lista de lances (SAN) de uma partida, testando o
 * prefixo mais longo primeiro e encurtando até achar uma linha nomeada no banco ECO. Retorna
 * a variação mais específica que bate — ex: pra uma Ruy Lopez que virou Berlin, retorna
 * "Ruy Lopez: Berlin Defense" em vez de só "Ruy Lopez".
 */
export function identifyOpening(moves: string[]): OpeningMatch | null {
  const limit = Math.min(moves.length, MAX_PLY)
  for (let k = limit; k >= 1; k--) {
    const hit = OPENINGS_MAP.get(moves.slice(0, k).join(' '))
    if (hit) return hit
  }
  return null
}
