import { describe, it, expect } from 'vitest'
import { findCriticalPosition } from './criticalPosition'
import type { ClassifiedMove } from './types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function move(overrides: Partial<ClassifiedMove>): ClassifiedMove {
  return {
    san: 'e4', from: 'e2', to: 'e4',
    fen: START_FEN, fenBefore: START_FEN,
    moveNumber: 1, color: 'w',
    classification: null, evalBefore: null, evalAfter: null,
    bestMove: null, clock: null,
    ...overrides,
  }
}

describe('findCriticalPosition', () => {
  it('retorna null pra lista vazia', () => {
    expect(findCriticalPosition([])).toBeNull()
  })

  it('retorna null quando nenhum lance tem avaliação (partida não analisada)', () => {
    const moves = [move({}), move({ moveNumber: 1, color: 'b' })]
    expect(findCriticalPosition(moves)).toBeNull()
  })

  it('escolhe o lance com maior queda de chance de vitória (a posição ANTES dele)', () => {
    const moves = [
      move({ san: 'e4', moveNumber: 1, color: 'w', evalBefore: 20, evalAfter: 15, fenBefore: 'fen-before-e4', classification: 'good' }),
      move({ san: 'e5', moveNumber: 1, color: 'b', evalBefore: -15, evalAfter: -10, fenBefore: 'fen-before-e5', classification: 'good' }),
      // Blunder claro de brancas: estava ganhando (before=500) e derrubou pra quase igual (after=0)
      move({ san: 'Qxf7', moveNumber: 2, color: 'w', evalBefore: 500, evalAfter: 0, fenBefore: 'fen-before-blunder', fen: 'fen-after-blunder', classification: 'blunder' }),
    ]
    const result = findCriticalPosition(moves)
    expect(result).not.toBeNull()
    expect(result!.fen).toBe('fen-before-blunder')
    expect(result!.move.san).toBe('Qxf7')
    expect(result!.isCheckmate).toBe(false)
    expect(result!.label).toContain('Capivarada')
  })

  it('prioriza xeque-mate sobre qualquer queda de avaliação quando a partida termina assim', () => {
    // Posição de mate do pastor (Fool's/Scholar's-like): FEN real de xeque-mate.
    const mateFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    const moves = [
      move({ san: 'f3', moveNumber: 1, color: 'w', evalBefore: 0, evalAfter: -50, fenBefore: 'f0', fen: 'f1', classification: 'inaccuracy' }),
      move({ san: 'e5', moveNumber: 1, color: 'b', evalBefore: 50, evalAfter: 60, fenBefore: 'f1', fen: 'f2', classification: 'good' }),
      move({ san: 'g4', moveNumber: 2, color: 'w', evalBefore: -60, evalAfter: -2000, fenBefore: 'f2', fen: 'f3-pos', classification: 'blunder' }),
      move({ san: 'Qh4', moveNumber: 2, color: 'b', evalBefore: 2000, evalAfter: 2000, fenBefore: 'f3-pos', fen: mateFen, classification: 'best' }),
    ]
    const result = findCriticalPosition(moves)
    expect(result).not.toBeNull()
    expect(result!.isCheckmate).toBe(true)
    expect(result!.fen).toBe(mateFen)
    expect(result!.label).toContain('Xeque-mate')
  })
})
