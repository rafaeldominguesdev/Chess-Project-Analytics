/**
 * Converte o relógio cru do PGN (`{[%clk H:MM:SS]}`, ver `pgnParser.ts`) em segundos. Aceita
 * `H:MM:SS` e `M:SS` (chess.com/Lichess usam os dois formatos dependendo do ritmo). `null` de
 * entrada (partida sem esse dado) ou formato irreconhecível devolvem `null`.
 */
export function parseClockSeconds(clock: string | null): number | null {
  if (!clock) return null
  const parts = clock.split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) return null
  if (parts.length === 3) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }
  if (parts.length === 2) {
    const [m, s] = parts
    return m * 60 + s
  }
  return null
}

/**
 * Converte o header `TimeControl` do PGN (`"600"`, `"600+5"`, `"1/259200"` pra correspondência
 * por dia) em segundos da parte base, ignorando incremento. `undefined`/formato irreconhecível
 * devolvem `null` — usado só pra normalizar "% de relógio restante" entre partidas de ritmos
 * diferentes (Relatório do jogador, Sprint 3), não pra recriar o relógio de verdade.
 */
export function parseTimeControlBaseSeconds(tc: string | undefined): number | null {
  if (!tc) return null
  const base = tc.split('+')[0].split('/').pop()
  const n = Number(base)
  return Number.isFinite(n) && n > 0 ? n : null
}
