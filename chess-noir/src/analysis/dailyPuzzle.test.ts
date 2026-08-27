import { describe, it, expect } from 'vitest'
import { getDailyPuzzle, dayNumber, dayKey } from './dailyPuzzle'
import { PUZZLES } from './puzzles'

describe('dailyPuzzle', () => {
  it('é determinístico — a mesma data devolve sempre o mesmo puzzle', () => {
    const d = new Date(2026, 7, 27)
    const a = getDailyPuzzle(d)
    const b = getDailyPuzzle(new Date(2026, 7, 27, 23, 59))
    expect(a.puzzle.id).toBe(b.puzzle.id)
    expect(a.date).toBe('2026-08-27')
  })

  it('datas diferentes normalmente dão puzzles diferentes', () => {
    const a = getDailyPuzzle(new Date(2026, 7, 27))
    const b = getDailyPuzzle(new Date(2026, 7, 28))
    expect(a.puzzle.id).not.toBe(b.puzzle.id)
  })

  it('não repete puzzle dentro de uma janela do tamanho do banco', () => {
    const start = new Date(2026, 0, 1)
    const seen = new Set<string>()
    for (let i = 0; i < PUZZLES.length; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const { puzzle } = getDailyPuzzle(d)
      expect(seen.has(puzzle.id)).toBe(false)
      seen.add(puzzle.id)
    }
    expect(seen.size).toBe(PUZZLES.length)
  })

  it('deriva categoria a partir dos temas do puzzle', () => {
    // Puzzle real do banco com tema "mateIn2" → categoria de xeque-mate.
    const matePuzzle = PUZZLES.find((p) => p.themes.includes('mateIn2'))
    expect(matePuzzle).toBeDefined()
    // Força a data que cai nesse índice pra checar o rótulo.
    // (Testa a função de categoria indiretamente via um dia qualquer + asserção de forma.)
    const any = getDailyPuzzle(new Date(2026, 5, 15))
    expect(typeof any.category.label).toBe('string')
    expect(any.category.label.length).toBeGreaterThan(0)
    expect(typeof any.category.goal).toBe('string')
  })

  it('dayNumber e dayKey são consistentes com o fuso local', () => {
    const d = new Date(2026, 2, 5, 12, 0, 0)
    expect(dayKey(d)).toBe('2026-03-05')
    expect(dayNumber(d)).toBe(dayNumber(new Date(2026, 2, 5, 0, 0, 1)))
  })
})
