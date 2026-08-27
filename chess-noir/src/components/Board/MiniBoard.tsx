import type { ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES, PIECE_SETS, PIECE_COLOR_FILTER } from '../../utils/boardThemes'

interface MiniBoardProps {
  /** Só a parte de posição do FEN é usada (`fen.split(' ')[0]`) — não precisa do resto. */
  fen: string
  size?: number
}

/**
 * Miniatura estática do tabuleiro (sem interação, sem coordenadas, sem drag) — preview de card
 * na lista do Treino de Aberturas. Não reaproveita `ChessBoard.tsx` (react-chessboard) de
 * propósito: dezenas de instâncias completas da lib numa lista rolável pesariam à toa só pra um
 * preview parado — isso aqui é uma grade CSS de 64 casas + `<img>` por peça, no mesmo tema de
 * tabuleiro/peças já ativo no resto do app (`useTheme`), pra não destoar visualmente.
 */
export function MiniBoard({ fen, size = 88 }: MiniBoardProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]
  const pieceSrc = PIECE_SETS[theme.pieceSet]?.src ?? theme.pieceSet
  const colorFilter = PIECE_COLOR_FILTER[theme.pieceSet]
  const square = size / 8

  const placement = fen.split(' ')[0]
  const ranks = placement.split('/')

  const cells: ReactNode[] = []
  ranks.forEach((rank, rankIdx) => {
    let fileIdx = 0
    for (const ch of rank) {
      if (/\d/.test(ch)) {
        const empty = parseInt(ch, 10)
        for (let i = 0; i < empty; i++) {
          const isLight = (rankIdx + fileIdx) % 2 === 0
          cells.push(<div key={`${rankIdx}-${fileIdx}`} style={{ background: bt.image ? 'transparent' : (isLight ? bt.light : bt.dark) }} />)
          fileIdx++
        }
      } else {
        const isLight = (rankIdx + fileIdx) % 2 === 0
        const isWhite = ch === ch.toUpperCase()
        const code = `${isWhite ? 'w' : 'b'}${ch.toUpperCase()}`
        cells.push(
          <div
            key={`${rankIdx}-${fileIdx}`}
            style={{ background: bt.image ? 'transparent' : (isLight ? bt.light : bt.dark), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src={`https://lichess1.org/assets/piece/${pieceSrc}/${code}.svg`}
              alt=""
              width={square * 0.82}
              height={square * 0.82}
              draggable={false}
              style={colorFilter ? { filter: colorFilter } : undefined}
            />
          </div>,
        )
        fileIdx++
      }
    }
  })

  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0,
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
        borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        border: '1px solid var(--color-gray-border)',
        ...(bt.image ? { backgroundImage: `url(${bt.image})`, backgroundSize: 'cover' } : {}),
      }}
    >
      {cells}
    </div>
  )
}
