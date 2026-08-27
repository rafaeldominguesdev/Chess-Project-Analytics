import { describe, it, expect } from 'vitest'
import { classifyMistakeReason } from './mistakeReasons'
import type { ErrorCandidate } from './errorExtraction'

// Todas as FENs abaixo foram validadas antes de entrar aqui (legais, o `bestMoveAfterUci`
// assumido é de fato um lance legal na posição, e — pros casos de back-rank — o resultado de
// xeque-mate foi confirmado direto contra o chess.js real, não só "parece certo de olho").

function candidate(overrides: Partial<ErrorCandidate>): ErrorCandidate {
  return {
    gameUrl: 'test', moveIndex: 0, fenBefore: '', fenAfter: '', sanPlayed: '', playerColor: 'w',
    bestMoveUci: 'a1a1', bestMoveAfterUci: null, classification: 'blunder',
    evalBefore: 0, evalAfter: 0, evalDelta: 0,
    gameInfo: { white: '', black: '', whiteElo: '', blackElo: '', result: '', date: '', event: '', termination: '' },
    ...overrides,
  }
}

describe('classifyMistakeReason — peça pendurada', () => {
  it('detecta torre branca sem defesa atacada pelo bispo preto', () => {
    const c = candidate({ playerColor: 'w', fenAfter: '4k3/8/1b6/8/3R4/8/8/4K3 b - - 0 1' })
    expect(classifyMistakeReason(c)).toBe('hanging_piece')
  })

  it('não dispara quando a mesma torre está defendida (cavalo em b3)', () => {
    const c = candidate({ playerColor: 'w', fenAfter: '4k3/8/1b6/8/3R4/1N6/8/4K3 b - - 0 1' })
    expect(classifyMistakeReason(c)).not.toBe('hanging_piece')
  })
})

describe('classifyMistakeReason — garfo não visto', () => {
  it('detecta cavalo preto forcando rei e torre brancos de uma vez (Nb4-c2)', () => {
    const c = candidate({
      playerColor: 'w',
      fenAfter: '4k3/8/8/8/1n6/8/8/R3K3 b - - 0 1',
      bestMoveAfterUci: 'b4c2',
    })
    expect(classifyMistakeReason(c)).toBe('missed_fork')
  })

  it('não dispara quando o mesmo salto só ataca o rei (torre removida do tabuleiro)', () => {
    const c = candidate({
      playerColor: 'w',
      fenAfter: '4k3/8/8/8/1n6/8/8/4K3 b - - 0 1',
      bestMoveAfterUci: 'b4c2',
    })
    expect(classifyMistakeReason(c)).not.toBe('missed_fork')
  })
})

describe('classifyMistakeReason — cravada/enfiada', () => {
  it('detecta bispo branco cravando o cavalo preto contra o próprio rei (Ba2-b3)', () => {
    const c = candidate({
      playerColor: 'b',
      fenAfter: '6k1/5n2/8/8/8/8/B7/4K3 w - - 0 1',
      bestMoveAfterUci: 'a2b3',
    })
    expect(classifyMistakeReason(c)).toBe('pin')
  })
})

describe('classifyMistakeReason — back-rank', () => {
  it('detecta mate na fileira de fundo (Rd8-d1#, rei branco preso atrás dos próprios peões)', () => {
    const c = candidate({
      playerColor: 'w',
      fenAfter: '3r2k1/8/8/8/8/8/5PPP/6K1 b - - 0 1',
      bestMoveAfterUci: 'd8d1',
    })
    expect(classifyMistakeReason(c)).toBe('back_rank')
  })

  it('não dispara quando o rei tem uma casa de fuga real (h2 vazia)', () => {
    const c = candidate({
      playerColor: 'w',
      fenAfter: '3r2k1/8/8/8/8/8/5PP1/6K1 b - - 0 1',
      bestMoveAfterUci: 'd8d1',
    })
    expect(classifyMistakeReason(c)).not.toBe('back_rank')
  })
})

describe('classifyMistakeReason — fallback', () => {
  it('cai em generic quando não há bestMoveAfterUci nem peça pendurada', () => {
    const c = candidate({ playerColor: 'w', fenAfter: '4k3/8/8/8/8/8/8/4K3 b - - 0 1', bestMoveAfterUci: null })
    expect(classifyMistakeReason(c)).toBe('generic')
  })
})
