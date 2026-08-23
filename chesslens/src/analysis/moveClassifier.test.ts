import { describe, it, expect } from 'vitest'
import { classifyMove, calcAccuracy, winningChances, toWhiteCp } from './moveClassifier'

describe('classifyMove', () => {
  it('returns "book" whenever isBook is true, regardless of eval/material', () => {
    expect(classifyMove(-9999, 9999, 'w', false, true, 99)).toBe('book')
  })

  it('returns "best" for the engine\'s top move with no material sacrifice', () => {
    expect(classifyMove(50, 999, 'w', true, false, 0)).toBe('best')
  })

  it('returns "brilliant" for the top move when it sacrifices material in a roughly balanced position', () => {
    expect(classifyMove(0, 999, 'w', true, false, 3)).toBe('brilliant')
  })

  it('does NOT call a sacrifice "brilliant" when already winning big (|before| >= 400)', () => {
    expect(classifyMove(500, 999, 'w', true, false, 3)).toBe('best')
  })

  it.each([
    ['excellent', 20, 19],
    ['great', 20, 15],
    ['good', 20, -20],
    ['inaccuracy', 20, -80],
    ['mistake', 20, -150],
    ['blunder', 20, -500],
  ] as const)('classifies a %s-sized eval drop correctly (white)', (expected, before, after) => {
    expect(classifyMove(before, after, 'w', false, false)).toBe(expected)
  })

  it('classifies "miss" for a big drop while still clearly winning (before >= 200)', () => {
    expect(classifyMove(600, 300, 'w', false, false)).toBe('miss')
  })

  it('is symmetric for black: mirrors the same cp values with sign flipped', () => {
    expect(classifyMove(-20, 80, 'b', false, false)).toBe(classifyMove(20, -80, 'w', false, false))
  })
})

describe('calcAccuracy', () => {
  it('returns 100 when there are no moves for that color', () => {
    expect(calcAccuracy([], 'w')).toBe(100)
  })

  it('returns ~100 for a side with zero eval swing across all moves', () => {
    const moves = Array.from({ length: 5 }, () => ({ color: 'w' as const, evalBefore: 20, evalAfter: 20 }))
    expect(calcAccuracy(moves, 'w')).toBe(100)
  })

  it('ignores moves belonging to the other color', () => {
    const moves = [{ color: 'b' as const, evalBefore: 20, evalAfter: -500 }]
    expect(calcAccuracy(moves, 'w')).toBe(100)
  })

  it('drops sharply for a single game-ending blunder', () => {
    const moves = [{ color: 'w' as const, evalBefore: 20, evalAfter: -500 }]
    expect(calcAccuracy(moves, 'w')).toBeLessThan(10)
  })

  it('weighs one hidden blunder much harder than a naive arithmetic mean would (harmonic-mean blend)', () => {
    const nineGood = Array.from({ length: 9 }, () => ({ color: 'w' as const, evalBefore: 20, evalAfter: 20 }))
    const withBlunder = [...nineGood, { color: 'w' as const, evalBefore: 20, evalAfter: -500 }]
    const result = calcAccuracy(withBlunder, 'w')
    // A média aritmética sozinha desse mix daria ~90 — a fórmula real (aritmética + harmônica)
    // precisa cair bem abaixo disso, é o que garante que um erro grave não fica "diluído".
    expect(result).toBeLessThan(60)
    expect(result).toBeGreaterThan(40)
  })

  it('rounds to one decimal place, not a whole number', () => {
    const moves = [
      { color: 'w' as const, evalBefore: 20, evalAfter: 20 },
      { color: 'w' as const, evalBefore: 20, evalAfter: -500 },
    ]
    expect(calcAccuracy(moves, 'w')).toBe(27.5)
  })
})

describe('winningChances', () => {
  it('is 0 at a dead-equal position (cp = 0)', () => {
    expect(winningChances(0)).toBe(0)
  })

  it('is antisymmetric: winningChances(-cp) === -winningChances(cp)', () => {
    expect(winningChances(-100)).toBeCloseTo(-winningChances(100), 10)
  })

  it('is monotonically increasing in cp', () => {
    expect(winningChances(100)).toBeGreaterThan(winningChances(0))
    expect(winningChances(0)).toBeGreaterThan(winningChances(-100))
  })

  it('stays within (-1, 1) even for extreme cp', () => {
    expect(winningChances(2000)).toBeLessThan(1)
    expect(winningChances(2000)).toBeGreaterThan(0.99)
  })
})

describe('toWhiteCp', () => {
  it('passes cp through unchanged when white is to move', () => {
    expect(toWhiteCp(50, null, 'w')).toBe(50)
  })

  it('flips sign when black is to move (engine score is side-relative)', () => {
    expect(toWhiteCp(50, null, 'b')).toBe(-50)
  })

  it('treats a mate score for the side to move as +/-2000 before the perspective flip', () => {
    expect(toWhiteCp(null, 3, 'w')).toBe(2000)
    expect(toWhiteCp(null, -2, 'b')).toBe(2000)
  })

  it('clamps to +/-2000 even for out-of-range cp', () => {
    expect(toWhiteCp(9999, null, 'w')).toBe(2000)
    expect(toWhiteCp(-9999, null, 'b')).toBe(2000)
  })

  it('defaults to 0 when both cp and mate are null', () => {
    expect(toWhiteCp(null, null, 'w')).toBe(0)
  })
})
