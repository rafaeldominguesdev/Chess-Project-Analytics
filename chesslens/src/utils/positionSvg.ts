import type { BoardThemeDef } from './boardThemes'

// Glifos Unicode de xadrez — não depende de nenhum dos 37 conjuntos de peças em PNG/SVG externo
// (`PIECE_SETS`), então a imagem exportada funciona sem precisar embutir/baixar assets de peça.
const PIECE_GLYPHS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const SQUARE = 64
const COORD_MARGIN = 26
const BOARD_SIZE = SQUARE * 8

export interface PositionSvgOptions {
  /** 'white' = a1 no canto inferior esquerdo (padrão); 'black' = tabuleiro virado. */
  orientation?: 'white' | 'black'
  /** Casa de origem/destino do lance a destacar (mesmas cores de marcação do tema atual). */
  highlightFrom?: string
  highlightTo?: string
  /** Legenda opcional desenhada abaixo do tabuleiro (ex: "24...Kxf1 — Capivarada"). */
  caption?: string
}

function squareToCoords(square: string, orientation: 'white' | 'black'): { col: number; row: number } {
  const fileIdx = FILES.indexOf(square[0])
  const rankIdx = Number(square[1]) - 1 // 0 = rank 1
  const col = orientation === 'white' ? fileIdx : 7 - fileIdx
  const row = orientation === 'white' ? 7 - rankIdx : rankIdx
  return { col, row }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Desenha uma posição (FEN) como SVG usando as cores do tema de tabuleiro ATUAL do usuário
 * (`BOARD_THEMES[...]`, `boardThemes.ts`) — pra ficar visualmente consistente com o resto do app
 * em vez de uma paleta nova. Peças em glifo Unicode (sem depender de asset de peça nenhum).
 * SVG puro (sem canvas) porque não precisa de nenhuma lib nova e abre em qualquer navegador.
 */
export function renderPositionSvg(fen: string, theme: BoardThemeDef, options: PositionSvgOptions = {}): string {
  const { orientation = 'white', highlightFrom, highlightTo, caption } = options
  const placement = fen.split(' ')[0]
  const ranks = placement.split('/') // ranks[0] = rank 8 ... ranks[7] = rank 1

  const captionHeight = caption ? 34 : 0
  const totalWidth = BOARD_SIZE + COORD_MARGIN
  const totalHeight = BOARD_SIZE + COORD_MARGIN + captionHeight

  let squares = ''
  let pieces = ''

  ranks.forEach((rankStr, rankRow) => {
    const rank = 8 - rankRow // 8..1
    // Expande a notação FEN da fileira (dígitos = corridas de casas vazias) numa lista de 8
    // células (peça ou null) — precisa desenhar TODAS as 8 casas, não só as ocupadas.
    const cells: (string | null)[] = []
    for (const ch of rankStr) {
      if (/\d/.test(ch)) { for (let k = 0; k < Number(ch); k++) cells.push(null); continue }
      cells.push(ch)
    }
    cells.forEach((ch, file) => {
      const square = `${FILES[file]}${rank}`
      const { col, row } = squareToCoords(square, orientation)
      const x = col * SQUARE
      const y = row * SQUARE
      const isLight = (file + rank) % 2 === 1
      const isHighlighted = square === highlightFrom || square === highlightTo
      const base = isLight ? theme.light : theme.dark
      squares += `<rect x="${x}" y="${y}" width="${SQUARE}" height="${SQUARE}" fill="${base}" />`
      if (isHighlighted) {
        const markColor = square === highlightFrom ? theme.moveFrom : theme.moveTo
        squares += `<rect x="${x}" y="${y}" width="${SQUARE}" height="${SQUARE}" fill="${markColor}" />`
      }
      const glyph = ch ? PIECE_GLYPHS[ch] : undefined
      if (glyph && ch) {
        const isWhitePiece = ch === ch.toUpperCase()
        pieces += `<text x="${x + SQUARE / 2}" y="${y + SQUARE / 2}" font-size="${SQUARE * 0.72}" `
          + `text-anchor="middle" dominant-baseline="central" `
          + `fill="${isWhitePiece ? '#F5F5F0' : '#1A1B1F'}" `
          + `stroke="${isWhitePiece ? '#2A2A2A' : '#F5F5F0'}" stroke-width="1" `
          + `font-family="'Noto Sans Symbols 2','Segoe UI Symbol',sans-serif">${glyph}</text>`
      }
    })
  })

  let coords = ''
  for (let i = 0; i < 8; i++) {
    const file = orientation === 'white' ? FILES[i] : FILES[7 - i]
    coords += `<text x="${i * SQUARE + SQUARE / 2}" y="${BOARD_SIZE + 17}" font-size="13" text-anchor="middle" fill="#8A8D96" font-family="sans-serif">${file}</text>`
    const rank = orientation === 'white' ? 8 - i : i + 1
    coords += `<text x="${BOARD_SIZE + 13}" y="${i * SQUARE + SQUARE / 2 + 5}" font-size="13" text-anchor="middle" fill="#8A8D96" font-family="sans-serif">${rank}</text>`
  }

  const captionSvg = caption
    ? `<text x="${totalWidth / 2}" y="${BOARD_SIZE + COORD_MARGIN + 22}" font-size="15" text-anchor="middle" fill="#ECEDF0" font-family="sans-serif" font-weight="600">${escapeXml(caption)}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`
    + `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#1A1B1F" />`
    + squares + pieces + coords + captionSvg
    + `</svg>`
}
