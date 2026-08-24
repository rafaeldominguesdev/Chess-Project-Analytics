import { describe, it, expect } from 'vitest'
import { BOT_LEVELS, MAX_UCI_ELO, MIN_UCI_ELO, clampUciElo, pickBotMove } from './botLevels'

describe('clampUciElo', () => {
  it('mantém valores já dentro do intervalo suportado pelo motor', () => {
    expect(clampUciElo(1600)).toBe(1600)
  })

  it('sobe valores abaixo do piso do motor (1320) — as faixas mais fracas pedem um Elo "de vitrine" mais baixo', () => {
    expect(clampUciElo(800)).toBe(MIN_UCI_ELO)
    expect(clampUciElo(1000)).toBe(MIN_UCI_ELO)
  })

  it('desce valores acima do teto do motor (3190)', () => {
    expect(clampUciElo(4000)).toBe(MAX_UCI_ELO)
  })
})

describe('BOT_LEVELS', () => {
  it('tem elo estritamente crescente (faixas ordenadas de mais fraca pra mais forte)', () => {
    for (let i = 1; i < BOT_LEVELS.length; i++) {
      expect(BOT_LEVELS[i].elo).toBeGreaterThan(BOT_LEVELS[i - 1].elo)
    }
  })

  it('tem ids únicos', () => {
    const ids = BOT_LEVELS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('multiPv sempre >= 1 e noiseDecay dentro de [0, 1)', () => {
    for (const level of BOT_LEVELS) {
      expect(level.multiPv).toBeGreaterThanOrEqual(1)
      expect(level.noiseDecay).toBeGreaterThanOrEqual(0)
      expect(level.noiseDecay).toBeLessThan(1)
    }
  })

  it('a faixa mais forte joga sem ruído (sempre a melhor linha)', () => {
    const strongest = BOT_LEVELS[BOT_LEVELS.length - 1]
    expect(strongest.multiPv).toBe(1)
    expect(strongest.noiseDecay).toBe(0)
  })
})

describe('pickBotMove', () => {
  it('devolve null quando não há nenhuma linha com lance', () => {
    expect(pickBotMove([null, null], 0.5)).toBeNull()
    expect(pickBotMove([{ bestMove: null }], 0.5)).toBeNull()
  })

  it('com uma única candidata, sempre joga ela (independente do ruído)', () => {
    const lines = [{ bestMove: 'e2e4' }]
    expect(pickBotMove(lines, 0.9, () => 0)).toBe('e2e4')
    expect(pickBotMove(lines, 0.9, () => 0.999)).toBe('e2e4')
  })

  it('noiseDecay = 0 sempre joga a melhor linha (rank 0), mesmo com várias candidatas', () => {
    const lines = [{ bestMove: 'e2e4' }, { bestMove: 'd2d4' }, { bestMove: 'g1f3' }]
    expect(pickBotMove(lines, 0, () => 0)).toBe('e2e4')
    expect(pickBotMove(lines, 0, () => 0.999)).toBe('e2e4')
  })

  it('ignora linhas nulas no meio (motor ainda não preencheu todas as multiPv pedidas)', () => {
    const lines = [{ bestMove: 'e2e4' }, null, { bestMove: 'g1f3' }]
    // rng bem baixo -> primeira candidata de verdade (e2e4); rng alto -> a última (g1f3)
    expect(pickBotMove(lines, 0.5, () => 0)).toBe('e2e4')
    expect(pickBotMove(lines, 0.5, () => 0.999)).toBe('g1f3')
  })

  it('respeita os pesos decrescentes por rank (rng determinístico cobrindo cada faixa)', () => {
    const lines = [{ bestMove: 'A' }, { bestMove: 'B' }, { bestMove: 'C' }]
    const decay = 0.5
    // pesos: 1, 0.5, 0.25 -> total 1.75 -> faixas [0, 1) / [1, 1.5) / [1.5, 1.75)
    const total = 1 + 0.5 + 0.25
    expect(pickBotMove(lines, decay, () => 0)).toBe('A')
    expect(pickBotMove(lines, decay, () => 0.999 / total)).toBe('A')
    expect(pickBotMove(lines, decay, () => 1.001 / total)).toBe('B')
    expect(pickBotMove(lines, decay, () => 1.499 / total)).toBe('B')
    expect(pickBotMove(lines, decay, () => 1.501 / total)).toBe('C')
    expect(pickBotMove(lines, decay, () => 1.749 / total)).toBe('C')
  })
})
