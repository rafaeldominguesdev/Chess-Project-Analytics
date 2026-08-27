import React from 'react'
import { PIECE_SETS, PIECE_COLOR_FILTER } from './boardThemes'
import type { PieceSetName } from '../types/theme.types'

const PIECE_CODES = ['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP'] as const

type PieceProps = { fill?: string; square?: string; svgStyle?: React.CSSProperties }

export function buildCustomPieces(pieceSet: PieceSetName): Record<string, (props?: PieceProps) => React.ReactElement> {
  const src = PIECE_SETS[pieceSet]?.src ?? pieceSet
  const colorFilter = PIECE_COLOR_FILTER[pieceSet]
  return Object.fromEntries(
    PIECE_CODES.map((p) => [
      p,
      (_props?: PieceProps) =>
        React.createElement('img', {
          src: `https://lichess1.org/assets/piece/${src}/${p}.svg`,
          width: '100%',
          height: '100%',
          alt: p,
          draggable: false,
          style: {
            display: 'block',
            // Peça um pouco maior que a casa (não só 100%) — pedido direto do usuário. 1.08 ficou
            // grande demais no teste visual; 1.03 é só o suficiente pra tirar o respiro do SVG
            // original sem estourar a casa (só o preset de peça ativo hoje, "Dubrovny Noir",
            // importa aqui — o seletor de peça foi removido da UI, ver skill chessnoir-design).
            transform: 'scale(1.03)',
            ...(colorFilter ? { filter: colorFilter } : {}),
          },
        }),
    ])
  )
}
