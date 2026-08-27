export type GamePhase = 'abertura' | 'meio-jogo' | 'final'

/**
 * Heurística simples de fase da partida — não tenta ser uma detecção "de verdade" (não olha
 * estrutura de peões, rei rocado, etc.), só o suficiente pra agregar precisão por fase no
 * Relatório do jogador (Sprint 3). Mesmo espírito de simplicidade aceito nas heurísticas de
 * motivo de erro (Sprint 2b): melhor uma régua simples e clara do que uma sofisticada e frágil.
 *
 * `moveNumber <= 10` cobre a abertura na grande maioria das partidas (linhas teóricas raramente
 * passam disso). Depois, `totalMaterial <= 20` (material das duas cores somado, sem contar reis —
 * ponto de partida é 78: 2×(8×1 + 2×3 + 2×3 + 2×5 + 1×9)) aproxima "a maioria das peças maiores já
 * saiu do tabuleiro" como final; o que sobra entre as duas é meio-jogo.
 */
export function detectGamePhase(moveNumber: number, totalMaterial: number): GamePhase {
  if (moveNumber <= 10) return 'abertura'
  if (totalMaterial <= 20) return 'final'
  return 'meio-jogo'
}
