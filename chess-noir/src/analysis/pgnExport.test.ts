import { describe, it, expect } from 'vitest'
import { annotatePgnWithNags, QUALITY_TO_NAG } from './pgnExport'
import { parsePgn } from './pgnParser'
import type { ClassifiedMove } from './types'
import type { MoveQuality } from './moveClassifier'

const SAMPLE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.23"]
[White "rafexzk"]
[Black "W_Sanches"]
[Result "1-0"]
[WhiteElo "1200"]
[BlackElo "1180"]

1. e4 {[%clk 0:10:00]} 1... e5 {[%clk 0:09:58]} 2. Nf3 {[%clk 0:09:55]} 2... Nc6 {[%clk 0:09:50]} 3. Bb5 {[%clk 0:09:52]} 1-0`

/** Aplica uma classificação em ordem às jogadas já parseadas de `SAMPLE_PGN` (5 lances). */
function withClassifications(qualities: (MoveQuality | null)[]): ClassifiedMove[] {
  const { moves } = parsePgn(SAMPLE_PGN)
  return moves.map((m, i) => ({ ...m, classification: qualities[i] ?? null }))
}

describe('annotatePgnWithNags', () => {
  it('preserva os headers originais inalterados', () => {
    const moves = withClassifications([null, null, null, null, null])
    const out = annotatePgnWithNags(SAMPLE_PGN, moves)
    expect(out).toContain('[Event "Live Chess"]')
    expect(out).toContain('[White "rafexzk"]')
    expect(out).toContain('[Result "1-0"]')
  })

  it('insere o NAG correto depois do lance classificado, sem tocar nos outros', () => {
    // e4=best(sem NAG), e5=mistake($2), Nf3=blunder($4), Nc6=inaccuracy($6), Bb5=brilliant($3)
    const moves = withClassifications(['best', 'mistake', 'blunder', 'inaccuracy', 'brilliant'])
    const out = annotatePgnWithNags(SAMPLE_PGN, moves)
    expect(out).toContain('1. e4 {[%clk 0:10:00]}')
    expect(out).not.toMatch(/e4 \$\d/)
    expect(out).toContain('e5 $2 {[%clk 0:09:58]}')
    expect(out).toContain('Nf3 $4 {[%clk 0:09:55]}')
    expect(out).toContain('Nc6 $6 {[%clk 0:09:50]}')
    expect(out).toContain('Bb5 $3 {[%clk 0:09:52]}')
  })

  it('preserva comentários de relógio existentes intactos', () => {
    const moves = withClassifications(['blunder', null, null, null, null])
    const out = annotatePgnWithNags(SAMPLE_PGN, moves)
    expect(out).toContain('{[%clk 0:10:00]}')
    expect(out).toContain('{[%clk 0:09:58]}')
  })

  it('não insere NAG em lances sem classificação (partida não totalmente analisada)', () => {
    const moves = withClassifications([null, null, null, null, null])
    const out = annotatePgnWithNags(SAMPLE_PGN, moves)
    expect(out).not.toMatch(/\$\d/)
  })

  it('não insere NAG em lances "book"/"best"/"great"/"good" (sem NAG convencional/são normais)', () => {
    const moves = withClassifications(['book', 'best', 'great', 'good', null])
    const out = annotatePgnWithNags(SAMPLE_PGN, moves)
    expect(out).not.toMatch(/\$\d/)
  })

  it('preserva o resultado final "1-0" sem tratá-lo como lance', () => {
    const moves = withClassifications(['best', 'best', 'best', 'best', 'best'])
    const out = annotatePgnWithNags(SAMPLE_PGN, moves)
    expect(out.trim().endsWith('1-0')).toBe(true)
  })

  it('QUALITY_TO_NAG mapeia miss e blunder para o mesmo NAG $4 (aproximação honesta, sem NAG exato pra "chance perdida")', () => {
    expect(QUALITY_TO_NAG.miss).toBe(4)
    expect(QUALITY_TO_NAG.blunder).toBe(4)
  })

  it('lida com número de lance colado sem espaço (ex: "2.Nf3")', () => {
    const gluedPgn = `[White "A"]\n[Black "B"]\n\n1.e4 e5 2.Nf3 Nc6 1-0`
    const { moves: parsedMoves } = parsePgn(gluedPgn)
    const moves = parsedMoves.map((m, i) => ({ ...m, classification: (['best', 'mistake', 'best', 'best'] as MoveQuality[])[i] }))
    const out = annotatePgnWithNags(gluedPgn, moves)
    expect(out).toContain('1.e4')
    expect(out).toContain('e5 $2')
    expect(out).toContain('2.Nf3')
  })
})
