import { useEffect, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { EvalBar } from '../Board/EvalBar'
import { PlayerCard } from './PlayerCard'
import { TheaterControls } from './TheaterControls'
import { useTheme } from '../../contexts/ThemeContext'
import { usePlayerProfiles } from '../../hooks/useChesscomApi'
import { BOARD_THEMES } from '../../utils/boardThemes'
import { buildCustomPieces } from '../../utils/pieceLoader'
import type { ClassifiedMove, GameInfo } from '../../types/chess.types'
import type { StockfishEval } from '../../hooks/useStockfish'

interface TheaterModeProps {
  fen: string
  lastMove: { from: string; to: string } | null
  moves: ClassifiedMove[]
  currentMoveIndex: number
  totalMoves: number
  gameInfo: GameInfo | null
  evaluation: StockfishEval | null
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  onExit: () => void
}

export function TheaterMode({
  fen, lastMove, moves, currentMoveIndex, totalMoves,
  gameInfo, evaluation, onFirst, onPrev, onNext, onLast, onExit,
}: TheaterModeProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]
  const customPieces = useMemo(() => buildCustomPieces(theme.pieceSet), [theme.pieceSet])
  const profiles = usePlayerProfiles(gameInfo?.white, gameInfo?.black)
  const turn = fen.split(' ')[1] === 'b' ? 'black' : 'white'

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext() }
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onExit])

  // Try fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    return () => { document.exitFullscreen?.().catch(() => {}) }
  }, [])

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    if (!lastMove) return {}
    return {
      [lastMove.from]: { backgroundColor: bt.moveFrom },
      [lastMove.to]: { backgroundColor: bt.moveTo },
    }
  }, [lastMove, bt])

  const boardSize = Math.min(560, window.innerHeight * 0.7)
  const currentMove = currentMoveIndex >= 0 ? moves[currentMoveIndex] : null
  const evalCp = evaluation?.cp ?? 0
  const evalMate = evaluation?.mate ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Black player — top */}
      <div className="mb-4" style={{ width: boardSize }}>
        <PlayerCard
          username={gameInfo?.black ?? 'Pretas'}
          rating={gameInfo?.blackElo ?? '?'}
          color="black"
          avatarUrl={profiles.black.avatar}
          title={profiles.black.title}
          isActive={turn === 'black'}
        />
      </div>

      {/* Board row */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, height: boardSize }}>
        {/* Thin eval bar */}
        <div style={{ width: 12, height: boardSize }}>
          <EvalBar evaluation={evalCp} isMate={evalMate} />
        </div>

        <div style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            options={{
              position: fen,
              squareStyles,
              boardStyle: {
                borderRadius: '4px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
                width: boardSize,
                height: boardSize,
              },
              darkSquareStyle: { backgroundColor: bt.dark },
              lightSquareStyle: { backgroundColor: bt.light },
              allowDragging: false,
              allowDrawingArrows: false,
              showNotation: false,
              pieces: customPieces,
            }}
          />
        </div>
      </div>

      {/* White player — bottom */}
      <div className="mt-4" style={{ width: boardSize }}>
        <PlayerCard
          username={gameInfo?.white ?? 'Brancas'}
          rating={gameInfo?.whiteElo ?? '?'}
          color="white"
          avatarUrl={profiles.white.avatar}
          title={profiles.white.title}
          isActive={turn === 'white'}
        />
      </div>

      {/* Controls */}
      <div className="mt-6">
        <TheaterControls
          currentMoveIndex={currentMoveIndex}
          totalMoves={totalMoves}
          moveSan={currentMove?.san ?? ''}
          onFirst={onFirst}
          onPrev={onPrev}
          onNext={onNext}
          onLast={onLast}
          onExit={onExit}
        />
      </div>
    </div>
  )
}
