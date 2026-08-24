import { describe, it, expect } from 'vitest'
import { isMovePreserving, pickHintMove } from './endgameTablebase'
import type { TablebasePosition } from './endgameTablebase'

describe('isMovePreserving', () => {
  it('mantém vitória: raiz "win", lance que deixa o adversário em "loss"', () => {
    expect(isMovePreserving('win', 'loss')).toBe(true)
  })

  it('perde a vitória: raiz "win", lance que deixa o adversário em "win" (o jogo virou)', () => {
    expect(isMovePreserving('win', 'win')).toBe(false)
  })

  it('mantém empate: raiz "draw", lance que deixa o adversário em "draw"', () => {
    expect(isMovePreserving('draw', 'draw')).toBe(true)
  })

  it('perde o empate: raiz "draw", lance que deixa o adversário em "loss" (virou derrota pro adversário == vitória própria, mas não era o resultado teórico original)', () => {
    // Raiz era empate — qualquer lance que mude pra "ganhando" ou "perdendo" quebra o resultado
    // teórico ORIGINAL, mesmo que o novo resultado seja "melhor" pro lado que jogou.
    expect(isMovePreserving('draw', 'loss')).toBe(false)
    expect(isMovePreserving('draw', 'win')).toBe(false)
  })

  it('numa posição já perdida, qualquer lance que continue perdido conta como certo (não existe lance melhor que mude o resultado teórico)', () => {
    expect(isMovePreserving('loss', 'win')).toBe(true) // adversário fica "win" = quem jogou continua perdendo
  })

  it('numa posição já perdida, um lance que vira empate NÃO preserva o resultado teórico original (mudou o resultado, mesmo que pra melhor)', () => {
    expect(isMovePreserving('loss', 'draw')).toBe(false)
  })

  it('trata cursed-win/blessed-loss como equivalentes a win/loss de verdade', () => {
    expect(isMovePreserving('cursed-win', 'blessed-loss')).toBe(true)
    expect(isMovePreserving('win', 'blessed-loss')).toBe(true)
  })

  it('categoria raiz "unknown" nunca reprova (sem dado suficiente pra travar o treino)', () => {
    expect(isMovePreserving('unknown', 'win')).toBe(true)
    expect(isMovePreserving('unknown', 'loss')).toBe(true)
  })
})

describe('pickHintMove', () => {
  const tablebase: TablebasePosition = {
    category: 'win',
    moves: [
      { uci: 'a1a5', san: 'Ra5', category: 'loss', dtz: -24 }, // preserva (adversário perde)
      { uci: 'e1e2', san: 'Ke2', category: 'loss', dtz: -30 }, // preserva, mas mais longe
      { uci: 'e1d2', san: 'Kd2', category: 'win', dtz: 12 },   // NÃO preserva (adversário ganha)
    ],
  }

  it('escolhe entre os lances que preservam o resultado', () => {
    const hint = pickHintMove(tablebase)
    expect(hint).not.toBeNull()
    expect(['a1a5', 'e1e2']).toContain(hint!.uci)
  })

  it('prefere o menor DTZ absoluto entre os que preservam', () => {
    const hint = pickHintMove(tablebase)
    expect(hint!.uci).toBe('a1a5') // |-24| < |-30|
  })

  it('devolve null quando nenhum lance preserva o resultado', () => {
    const allBad: TablebasePosition = {
      category: 'win',
      moves: [{ uci: 'e1d2', san: 'Kd2', category: 'win', dtz: 12 }],
    }
    expect(pickHintMove(allBad)).toBeNull()
  })

  it('devolve null quando não há lances', () => {
    expect(pickHintMove({ category: 'draw', moves: [] })).toBeNull()
  })
})
