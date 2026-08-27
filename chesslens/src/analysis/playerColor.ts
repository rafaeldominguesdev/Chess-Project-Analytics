import type { StoredGame } from '../persistence/types'

// Mesmas chaves de `SearchView.tsx` (`LAST_SEARCH_KEY-${platform}`) — duplicadas aqui de
// propósito: `analysis/` não pode importar de `components/` (mesma regra que motivou a extração
// de `src/analysis/` no Sprint 0), e são só 2 strings literais, não vale criar um módulo
// compartilhado só pra isso.
const LAST_SEARCH_KEYS = ['chessnoir-last-player-search-chesscom', 'chessnoir-last-player-search-lichess']

function lastSearchedUsernames(): string[] {
  try {
    return LAST_SEARCH_KEYS.map((k) => localStorage.getItem(k)).filter((v): v is string => !!v)
  } catch {
    return [] // localStorage indisponível — sem candidato, `resolvePlayerColor` cai em `null`
  }
}

/**
 * Descobre de qual lado (branco/preto) o dono do app jogou uma partida salva — necessário pra
 * qualquer estatística "minha" no Relatório do jogador (Sprint 3): precisão por fase, taxa de
 * erro por relógio, desempenho por abertura etc. só fazem sentido filtrados pro lado certo.
 *
 * Prioridade: (1) `perspectiveColor` já salvo (partidas analisadas depois desta mudança, ver
 * `App.tsx`/`gamesRepo.ts`); (2) fallback por nome pra partidas mais antigas, comparando
 * `gameInfo.white`/`black` contra os últimos usernames buscados por plataforma. Sem match único
 * (nenhum bate, ou os dois batem — ex: analisando a própria partida contra si mesmo) devolve
 * `null` — melhor descartar a partida da agregação do que arriscar o lado errado (mesma filosofia
 * do `'generic'` de `mistakeReasons.ts`).
 */
export function resolvePlayerColor(game: StoredGame, candidateUsernames?: string[]): 'w' | 'b' | null {
  if (game.perspectiveColor) return game.perspectiveColor

  const candidates = candidateUsernames ?? lastSearchedUsernames()
  const whiteMatches = candidates.some((c) => c.toLowerCase() === game.gameInfo.white.toLowerCase())
  const blackMatches = candidates.some((c) => c.toLowerCase() === game.gameInfo.black.toLowerCase())
  if (whiteMatches && !blackMatches) return 'w'
  if (blackMatches && !whiteMatches) return 'b'
  return null
}
