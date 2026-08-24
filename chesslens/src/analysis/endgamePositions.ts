import endgamePositionsRaw from '../data/endgame-positions.json'
import type { MasteryStats } from './masteryStats'

export type EndgameCategory = 'kp_vs_k' | 'kr_vs_k' | 'kq_vs_k' | 'rook_vs_pawn' | 'pawn_endgame'

export interface EndgamePosition {
  id: string
  fen: string
  category: EndgameCategory
  label: string
}

type RawEndgamePosition = [string, string, EndgameCategory, string]

export const ENDGAME_CATEGORY_LABELS: Record<EndgameCategory, string> = {
  kp_vs_k: 'Rei e peão vs rei',
  kr_vs_k: 'Rei e torre vs rei',
  kq_vs_k: 'Rei e dama vs rei',
  rook_vs_pawn: 'Torre vs peão',
  pawn_endgame: 'Final de peões',
}

// Conjunto inicial pequeno e hardcoded (~13 posições) — pedido explícito do Sprint 4: gerar
// posições de final válidas aleatoriamente do zero é seu próprio projeto, fora do escopo daqui.
// Cobre os temas citados no roadmap (K+P vs K, K+R vs K, K+Q vs K, Torre vs Peão, finais de peão
// básicos), mesmo padrão de dado bruto em `src/data/` de `eco-openings.json`/`puzzles.json` — só
// que bem menor, já que aqui não faz sentido (nem é viável) ter milhares de finais catalogados à
// mão. Cada FEN já foi validada como legal (reis não adjacentes, ninguém em xeque fora de quem
// tem o lance, contra o chess.js real) antes de entrar aqui.
export const ENDGAME_POSITIONS: EndgamePosition[] = (endgamePositionsRaw as RawEndgamePosition[]).map(
  ([id, fen, category, label]) => ({ id, fen, category, label }),
)

/** Ordena as posições pelo mastery da CATEGORIA (mais baixo primeiro) — mesma aproximação já
 *  usada no Treino de Erros (`buildQueue` em `useErrorTrainer.ts`): não é repetição espaçada de
 *  verdade, só um placar que pesa mais as sessões recentes (`bumpMastery`, média móvel 65/35)
 *  pra puxar mais o que a pessoa mais erra. Como o conjunto aqui é pequeno e fixo (não vem de um
 *  scan de partidas), não precisa do corte por partida que o Treino de Erros tem — só a ordenação. */
export function buildEndgameQueue(
  positions: EndgamePosition[], stats: Record<string, MasteryStats>,
): EndgamePosition[] {
  return [...positions].sort((a, b) => (stats[a.category]?.mastery ?? 50) - (stats[b.category]?.mastery ?? 50))
}
