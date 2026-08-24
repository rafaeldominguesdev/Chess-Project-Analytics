import endgamePositionsRaw from '../data/endgame-positions.json'
import type { MasteryStats } from './masteryStats'

export type EndgameCategory =
  | 'kp_vs_k' | 'kr_vs_k' | 'kq_vs_k' | 'rook_vs_pawn' | 'pawn_endgame'
  | 'rook_endgame' | 'queen_endgame' | 'bishop_endgame' | 'knight_endgame' | 'queen_rook_endgame'

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
  rook_endgame: 'Final de torres',
  queen_endgame: 'Final de damas',
  bishop_endgame: 'Final de bispos',
  knight_endgame: 'Final de cavalos',
  queen_rook_endgame: 'Final de dama e torre',
}

// 13 posições hardcoded do Sprint 4 (K+P vs K, K+R vs K, K+Q vs K, Torre vs Peão, finais de peão
// básicos — técnica pura, poucas peças) + 4200 baixadas do banco público de puzzles do Lichess
// (`database.lichess.org/lichess_db_puzzle.csv.zst`, licença CC0 — mesma fonte de `puzzles.json`),
// a pedido direto do usuário ("baixe mais partida de finais pra estudar, o máximo"). As baixadas
// vieram de puzzles reais marcados com um tema de final específico (`pawnEndgame`/`rookEndgame`/
// `bishopEndgame`/`knightEndgame`/`queenEndgame`/`queenRookEndgame`), usando a posição DEPOIS do
// lance de preparo do puzzle (não a sequência de solução inteira — aqui só importa o ponto de
// partida), filtradas por no máximo 7 peças no tabuleiro (cobertura confiável da tablebase
// pública do Lichess — testado ao vivo: nenhuma amostra voltou "unknown") e por popularidade
// mínima (≥50 partidas jogadas, evita puzzle obscuro/mal rotulado), 700 por categoria (as 6 novas
// tinham de 3 mil a 55 mil candidatos cada — 700 foi o corte escolhido pra não inflar demais o
// bundle, não porque faltou material). Rótulo de cada posição baixada é o material dos dois lados
// (ex: "Rei e Torre e Peão vs Rei e Torre"), gerado automaticamente — não dá pra escrever texto
// descritivo à mão em milhares de posições como nas 13 originais. Cada FEN já foi validada como
// legal (reis não adjacentes, ninguém em xeque fora de quem tem o lance) contra o chess.js/
// python-chess antes de entrar aqui.
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
