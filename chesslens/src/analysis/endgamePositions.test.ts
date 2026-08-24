import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { ENDGAME_POSITIONS, buildEndgameQueue } from './endgamePositions'
import type { EndgamePosition } from './endgamePositions'
import type { MasteryStats } from './masteryStats'

describe('ENDGAME_POSITIONS', () => {
  it('tem pelo menos uma posição de cada categoria do roadmap (K+P vs K, K+R vs K, K+Q vs K, Torre vs Peão, final de peões)', () => {
    const categories = new Set(ENDGAME_POSITIONS.map((p) => p.category))
    expect(categories).toEqual(new Set(['kp_vs_k', 'kr_vs_k', 'kq_vs_k', 'rook_vs_pawn', 'pawn_endgame']))
  })

  it('todo FEN é legal pro chess.js real (reis não adjacentes, ninguém em xeque fora de quem tem o lance)', () => {
    for (const pos of ENDGAME_POSITIONS) {
      expect(() => new Chess(pos.fen)).not.toThrow()
    }
  })

  it('não tem ids duplicados', () => {
    const ids = ENDGAME_POSITIONS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('buildEndgameQueue', () => {
  const positions: EndgamePosition[] = [
    { id: 'a', fen: '8/8/8/8/8/8/8/8 w - - 0 1', category: 'kp_vs_k', label: 'A' },
    { id: 'b', fen: '8/8/8/8/8/8/8/8 w - - 0 1', category: 'kr_vs_k', label: 'B' },
    { id: 'c', fen: '8/8/8/8/8/8/8/8 w - - 0 1', category: 'kq_vs_k', label: 'C' },
  ]

  it('ordena pelo mastery da categoria, mais baixo primeiro', () => {
    const stats: Record<string, MasteryStats> = {
      kp_vs_k: { attempts: 3, mastery: 90, lastPracticed: 0 },
      kr_vs_k: { attempts: 1, mastery: 20, lastPracticed: 0 },
      kq_vs_k: { attempts: 2, mastery: 55, lastPracticed: 0 },
    }
    const ordered = buildEndgameQueue(positions, stats)
    expect(ordered.map((p) => p.category)).toEqual(['kr_vs_k', 'kq_vs_k', 'kp_vs_k'])
  })

  it('categoria sem histórico ainda vale mastery 50 (mesmo default de bumpMastery)', () => {
    const stats: Record<string, MasteryStats> = {
      kp_vs_k: { attempts: 5, mastery: 80, lastPracticed: 0 },
      // kr_vs_k e kq_vs_k sem entrada — tratados como 50, entre 20 (nenhum aqui) e 80
    }
    const ordered = buildEndgameQueue(positions, stats)
    // kp_vs_k (80) deve ficar por último; as duas sem histórico (50) vêm antes, em qualquer ordem entre si
    expect(ordered[ordered.length - 1].category).toBe('kp_vs_k')
    expect(new Set(ordered.slice(0, 2).map((p) => p.category))).toEqual(new Set(['kr_vs_k', 'kq_vs_k']))
  })

  it('não muta o array original', () => {
    const copy = [...positions]
    buildEndgameQueue(positions, {})
    expect(positions).toEqual(copy)
  })
})
