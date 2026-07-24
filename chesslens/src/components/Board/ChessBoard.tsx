import { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { EvalBar } from './EvalBar'
import { MoveQualityBadge } from './MoveQualityBadge'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES } from '../../utils/boardThemes'
import { buildCustomPieces } from '../../utils/pieceLoader'
import type { StockfishEval } from '../../hooks/useStockfish'
import type { MoveQuality } from '../../utils/moveClassifier'

interface PieceDropArgs {
  piece: { pieceType?: string } | null
  sourceSquare: string
  targetSquare: string | null
}

interface ChessBoardProps {
  fen: string
  lastMove: { from: string; to: string } | null
  evaluation: StockfishEval | null
  isLoaded: boolean
  currentMoveIndex: number
  totalMoves: number
  boardWidth: number
  currentQuality?: MoveQuality | null
  showEvalBar?: boolean
  showControls?: boolean
  interactive?: boolean
  boardOrientation?: 'white' | 'black'
  extraArrows?: { startSquare: string; endSquare: string; color: string }[]
  onPieceDrop?: (args: PieceDropArgs) => boolean
  onFirst?: () => void
  onPrev?: () => void
  onNext?: () => void
  onLast?: () => void
  onTheater?: () => void
}

const ANIMATION_MS: Record<string, number> = {
  none: 0, fast: 80, normal: 150, slow: 350,
}

const NAV_BTN = 'w-9 h-9 rounded flex items-center justify-center text-sm font-medium transition-opacity disabled:opacity-30 disabled:cursor-not-allowed'

export function ChessBoard({
  fen,
  lastMove,
  evaluation,
  isLoaded,
  currentMoveIndex,
  totalMoves,
  boardWidth,
  currentQuality,
  showEvalBar = true,
  showControls = true,
  interactive = false,
  boardOrientation = 'white',
  extraArrows,
  onPieceDrop,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onTheater,
}: ChessBoardProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    if (!theme.showLastMove || !lastMove) return {}
    return {
      [lastMove.from]: { backgroundColor: bt.moveFrom },
      [lastMove.to]: { backgroundColor: bt.moveTo },
    }
  }, [lastMove, theme.showLastMove, bt])

  const customPieces = useMemo(() => buildCustomPieces(theme.pieceSet), [theme.pieceSet])

  const arrowsOption = useMemo(() => {
    const arr: { startSquare: string; endSquare: string; color: string }[] = []
    if (theme.showArrows && evaluation?.bestMove && evaluation.bestMove.length >= 4) {
      const bm = evaluation.bestMove
      arr.push({ startSquare: bm.slice(0, 2), endSquare: bm.slice(2, 4), color: '#1BACA6' })
    }
    if (extraArrows) arr.push(...extraArrows)
    return arr
  }, [evaluation?.bestMove, theme.showArrows, extraArrows])

  const atStart = currentMoveIndex === -1
  const atEnd = currentMoveIndex === totalMoves - 1 || totalMoves === 0

  const evalCp = evaluation?.cp ?? 0
  const evalMate = evaluation?.mate ?? null

  return (
    <div className="flex flex-col gap-2">
      {/* Board + EvalBar row */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, height: boardWidth }}>
        {showEvalBar && <EvalBar evaluation={evalCp} isMate={evalMate} orientation={boardOrientation} />}
        <div style={{ width: boardWidth, height: boardWidth, flexShrink: 0, position: 'relative' }}>
          <Chessboard
            options={{
              position: fen,
              squareStyles,
              arrows: arrowsOption,
              boardOrientation,
              boardStyle: {
                borderRadius: '6px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                width: boardWidth,
                height: boardWidth,
              },
              darkSquareStyle: { backgroundColor: bt.dark },
              lightSquareStyle: { backgroundColor: bt.light },
              allowDragging: interactive,
              allowDrawingArrows: false,
              showNotation: theme.showCoordinates,
              animationDurationInMs: ANIMATION_MS[theme.animationSpeed] ?? 150,
              pieces: customPieces,
              ...(onPieceDrop ? { onPieceDrop } : {}),
            }}
          />

          {/* Badge de qualidade do lance atual */}
          {currentQuality && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, pointerEvents: 'none', animation: 'pop 0.25s ease-out' }}>
              <MoveQualityBadge quality={currentQuality} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-1"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-center gap-1">
            <button className={NAV_BTN} style={{ color: 'var(--text)', backgroundColor: 'var(--surface2)' }} onClick={onFirst} disabled={atStart || !isLoaded} title="Início">⏮</button>
            <button className={NAV_BTN} style={{ color: 'var(--text)', backgroundColor: 'var(--surface2)' }} onClick={onPrev} disabled={atStart || !isLoaded} title="Anterior">◀</button>
            <span className="text-xs px-2" style={{ color: 'var(--text-muted)', minWidth: 90, textAlign: 'center' }}>
              {isLoaded
                ? currentMoveIndex === -1
                  ? 'Início'
                  : `${currentMoveIndex + 1} / ${totalMoves}`
                : '—'}
            </span>
            <button className={NAV_BTN} style={{ color: 'var(--text)', backgroundColor: 'var(--surface2)' }} onClick={onNext} disabled={atEnd || !isLoaded} title="Próximo">▶</button>
            <button className={NAV_BTN} style={{ color: 'var(--text)', backgroundColor: 'var(--surface2)' }} onClick={onLast} disabled={atEnd || !isLoaded} title="Último">⏭</button>
          </div>

          {onTheater && (
            <button
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface2)' }}
              onClick={onTheater}
              title="Modo Teatro (T)"
            >
              ⛶
            </button>
          )}
        </div>
      )}
    </div>
  )
}
