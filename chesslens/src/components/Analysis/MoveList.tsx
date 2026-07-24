import { useRef, useEffect } from 'react'
import { MoveQualityBadge } from '../Board/MoveQualityBadge'
import type { ClassifiedMove } from '../../types/chess.types'

interface MoveListProps {
  moves: ClassifiedMove[]
  currentMoveIndex: number
  onGoTo: (index: number) => void
}

export function MoveList({ moves, currentMoveIndex, onGoTo }: MoveListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentMoveIndex])

  if (moves.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Carregue uma partida.</p>
  }

  const rows = Math.ceil(moves.length / 2)

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr', gap: '1px 4px' }}>
        {Array.from({ length: rows }, (_, i) => {
          const wIdx = i * 2
          const bIdx = i * 2 + 1
          const wMove = moves[wIdx]
          const bMove = moves[bIdx]

          return (
            <div key={i} className="contents">
              <span className="py-1 text-xs flex items-center" style={{ color: 'var(--text-muted)' }}>
                {i + 1}.
              </span>

              <MoveBtn
                move={wMove}
                active={currentMoveIndex === wIdx}
                ref={currentMoveIndex === wIdx ? activeRef : null}
                onClick={() => onGoTo(wIdx)}
              />

              {bMove ? (
                <MoveBtn
                  move={bMove}
                  active={currentMoveIndex === bIdx}
                  ref={currentMoveIndex === bIdx ? activeRef : null}
                  onClick={() => onGoTo(bIdx)}
                />
              ) : (
                <span />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { forwardRef } from 'react'

const MoveBtn = forwardRef<HTMLButtonElement, {
  move: ClassifiedMove
  active: boolean
  onClick: () => void
}>(({ move, active, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className="flex items-center gap-1 px-1 py-1 rounded text-xs text-left w-full transition-colors"
    style={{
      backgroundColor: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--bg)' : 'var(--text)',
      fontWeight: active ? 700 : 400,
    }}
  >
    <span>{move.san}</span>
    {move.classification && (
      <MoveQualityBadge quality={move.classification} size="sm" />
    )}
  </button>
))
MoveBtn.displayName = 'MoveBtn'
