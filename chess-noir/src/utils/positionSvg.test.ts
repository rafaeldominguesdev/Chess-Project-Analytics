import { describe, it, expect } from 'vitest'
import { renderPositionSvg } from './positionSvg'
import { BOARD_THEMES } from './boardThemes'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const theme = BOARD_THEMES['chesscom-green']

describe('renderPositionSvg', () => {
  it('gera um SVG válido (raiz <svg>, fecha a tag)', () => {
    const svg = renderPositionSvg(START_FEN, theme)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trim().endsWith('</svg>')).toBe(true)
  })

  it('desenha as 64 casas e as 32 peças da posição inicial', () => {
    const svg = renderPositionSvg(START_FEN, theme)
    // 64 casas + 1 retângulo de fundo do canvas inteiro (área de coordenadas/legenda).
    expect(svg.match(/<rect /g)?.length).toBe(65)
    // 32 peças = 32 glifos unicode de peça no total de <text> (os labels de coordenada usam
    // font-size diferente — filtra pelo tamanho de fonte de peça, SQUARE*0.72 = 46.08).
    const pieceTexts = svg.split('<text').filter((chunk) => chunk.includes('font-size="46.08'))
    expect(pieceTexts.length).toBe(32)
  })

  it('usa as cores claro/escuro do tema recebido, não uma paleta hardcoded', () => {
    const svg = renderPositionSvg(START_FEN, theme)
    expect(svg).toContain(theme.light)
    expect(svg).toContain(theme.dark)
  })

  it('marca as casas from/to com as cores de marcação do tema quando fornecidas', () => {
    const svg = renderPositionSvg(START_FEN, theme, { highlightFrom: 'e2', highlightTo: 'e4' })
    expect(svg).toContain(theme.moveFrom)
    expect(svg).toContain(theme.moveTo)
  })

  it('inclui a legenda (caption) escapada como texto, quando fornecida', () => {
    const svg = renderPositionSvg(START_FEN, theme, { caption: 'Q&A <teste>' })
    expect(svg).toContain('Q&amp;A &lt;teste&gt;')
  })

  it('espelha as coordenadas quando orientation="black"', () => {
    const white = renderPositionSvg(START_FEN, theme, { orientation: 'white' })
    const black = renderPositionSvg(START_FEN, theme, { orientation: 'black' })
    expect(white).not.toBe(black)
  })
})
