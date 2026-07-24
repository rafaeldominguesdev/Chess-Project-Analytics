import React from 'react'

const PIECE_CODES = ['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP'] as const

type PieceProps = { fill?: string; square?: string; svgStyle?: React.CSSProperties }

export function buildCustomPieces(pieceSet: string): Record<string, (props?: PieceProps) => React.ReactElement> {
  return Object.fromEntries(
    PIECE_CODES.map((p) => [
      p,
      (_props?: PieceProps) =>
        React.createElement('img', {
          src: `https://lichess1.org/assets/piece/${pieceSet}/${p}.svg`,
          width: '100%',
          height: '100%',
          alt: p,
          draggable: false,
          style: { display: 'block' },
        }),
    ])
  )
}
